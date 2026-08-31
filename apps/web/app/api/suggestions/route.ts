import { NextRequest, NextResponse } from "next/server";
import { LocalStore } from "unforgit-db";
import { generateSuggestions, persistReviewableSuggestions } from "unforgit-core";
import type { CurationSuggestionStatus } from "unforgit-shared";
import { getConfig } from "@/lib/stores";
import { getDbPath } from "@/lib/config";

const allowedStatuses = new Set(["pending", "approved", "rejected", "applied"]);

function reviewErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Curation suggestion not found:")) return 404;
  if (
    message.startsWith("Cannot transition curation suggestion") ||
    message.startsWith("Curation suggestion is stale:") ||
    message.startsWith("Curation suggestion changed while reviewing:")
  ) {
    return 409;
  }
  return 500;
}

function parseStatuses(value: string | null): CurationSuggestionStatus[] {
  if (!value) return ["pending"];
  const statuses = value.split(",").map((status) => status.trim()).filter(Boolean);
  const invalid = statuses.find((status) => !allowedStatuses.has(status));
  if (invalid) {
    throw new Error(`Invalid suggestion status: ${invalid}`);
  }
  return statuses as CurationSuggestionStatus[];
}

export async function GET(request: NextRequest) {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Unforgit not initialized" },
      { status: 500 },
    );
  }

  const params = request.nextUrl.searchParams;
  const maxSuggestions = Number.parseInt(params.get("max") ?? "20", 10);

  let statuses: CurationSuggestionStatus[];
  try {
    statuses = parseStatuses(params.get("status"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid status" },
      { status: 400 },
    );
  }

  const store = new LocalStore(getDbPath());
  try {
    const orgId = config.remote.orgId;
    const repoId = config.remote.repoId;
    const suggestions = store.listCurationSuggestions({
      orgId,
      repoId,
      status: statuses,
      limit: maxSuggestions,
    });

    return NextResponse.json({
      suggestions,
      stats: {
        returned: suggestions.length,
        status: statuses,
      },
    });
  } catch (error) {
    console.error("Failed to load suggestions:", error);
    return NextResponse.json(
      { error: "Failed to load suggestions" },
      { status: 500 },
    );
  } finally {
    store.close();
  }
}

export async function POST(request: NextRequest) {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Unforgit not initialized" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null) as {
    action?: "generate";
    maxSuggestions?: number;
    id?: string;
    status?: CurationSuggestionStatus;
    reviewedBy?: string;
    reviewNote?: string;
  } | null;

  if (body?.action === "generate") {
    const maxSuggestions = body.maxSuggestions ?? 20;
    if (!Number.isInteger(maxSuggestions) || maxSuggestions < 1 || maxSuggestions > 500) {
      return NextResponse.json(
        { error: "maxSuggestions must be an integer from 1 to 500" },
        { status: 400 },
      );
    }

    const store = new LocalStore(getDbPath());
    try {
      const orgId = config.remote.orgId;
      const repoId = config.remote.repoId;
      const generated = generateSuggestions(store, orgId, repoId, {
        maxSuggestions,
      });
      const persisted = persistReviewableSuggestions(
        store,
        orgId,
        repoId,
        generated.suggestions,
        { createdBy: "dashboard" },
      );
      const suggestions = store.listCurationSuggestions({
        orgId,
        repoId,
        status: ["pending"],
        limit: maxSuggestions,
      });

      return NextResponse.json({
        suggestions,
        stats: {
          returned: suggestions.length,
          status: ["pending"],
          ...generated.stats,
          ...persisted,
        },
      });
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
      return NextResponse.json(
        { error: "Failed to generate suggestions" },
        { status: 500 },
      );
    } finally {
      store.close();
    }
  }

  if (!body?.id) {
    return NextResponse.json({ error: "Missing suggestion id" }, { status: 400 });
  }

  if (!body.status || body.status === "pending" || !allowedStatuses.has(body.status)) {
    return NextResponse.json(
      { error: "Status must be approved, rejected, or applied" },
      { status: 400 },
    );
  }

  const store = new LocalStore(getDbPath());
  try {
    const suggestion = store.reviewCurationSuggestion({
      id: body.id,
      orgId: config.remote.orgId,
      repoId: config.remote.repoId,
      status: body.status,
      reviewedBy: body.reviewedBy,
      reviewNote: body.reviewNote,
    });
    return NextResponse.json({ suggestion });
  } catch (error) {
    const status = reviewErrorStatus(error);
    if (status === 500) console.error("Failed to review suggestion:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to review suggestion" },
      { status },
    );
  } finally {
    store.close();
  }
}
