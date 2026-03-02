import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";
import type { ListQuery, Memory } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 },
    );
  }

  const source = params.get("source") ?? "local";
  const search = params.get("search") ?? undefined;
  const types = params.get("types")?.split(",").filter(Boolean) as
    | ListQuery["types"]
    | undefined;
  const status = params.get("status")?.split(",").filter(Boolean) as
    | ListQuery["status"]
    | undefined;
  const tags = params.get("tags")?.split(",").filter(Boolean) ?? undefined;
  const limit = parseInt(params.get("limit") ?? "50", 10);
  const offset = parseInt(params.get("offset") ?? "0", 10);
  const sortBy =
    (params.get("sortBy") as ListQuery["sortBy"]) ?? "createdAt";
  const sortOrder =
    (params.get("sortOrder") as ListQuery["sortOrder"]) ?? "desc";

  const query: ListQuery = {
    orgId: config.remote.orgId,
    repoId: config.remote.repoId,
    types,
    status,
    tags,
    search,
    limit,
    offset,
    sortBy,
    sortOrder,
  };

  let memories: (Memory & { source: "local" | "remote" })[] = [];
  let total = 0;

  if (source === "local" || source === "both") {
    const local = getLocalStore();
    if (local) {
      const localMemories = local.list(query);
      const localCount = local.count(query);
      memories.push(
        ...localMemories.map((m) => ({ ...m, source: "local" as const })),
      );
      total += localCount;
    }
  }

  if (source === "both") {
    memories.sort((a, b) => {
      const aVal =
        sortBy === "confidence"
          ? (a.confidence ?? 0)
          : a[sortBy ?? "createdAt"].getTime();
      const bVal =
        sortBy === "confidence"
          ? (b.confidence ?? 0)
          : b[sortBy ?? "createdAt"].getTime();
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    memories = memories.slice(0, limit);
  }

  return NextResponse.json({ memories, total });
}

export async function POST(request: NextRequest) {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 },
    );
  }

  const body = await request.json();

  const input = {
    orgId: config.remote.orgId,
    repoId: config.remote.repoId,
    memoryType: body.memoryType ?? "episodic",
    text: body.text,
    summary: body.summary,
    tags: body.tags ?? [],
    sourceRefs: body.sourceRefs,
    confidence: body.confidence,
    visibility: body.visibility ?? "auto",
  };

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 },
    );
  }
  const memory = local.store(input);
  return NextResponse.json({ memory, source: "local" }, { status: 201 });
}
