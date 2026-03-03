import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

interface ConsolidationHistoryItem {
  id: string;
  text: string;
  memoryType: string;
  tags: string[];
  status: string;
  consolidationVersion: number;
  createdAt: string;
  sourceCount: number;
  sourceIds: string[];
}

export async function GET(request: NextRequest) {
  const config = getConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 },
    );
  }

  const store = getLocalStore();
  if (!store) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const statuses = includeDeleted ? ["active", "superseded", "deleted"] : ["active"];

  const memories = store.list({
    orgId: config.remote.orgId,
    repoId: config.remote.repoId,
    status: statuses,
    limit: 500,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const consolidations = memories.filter((m) => m.isConsolidation === true);

  const historyItems: ConsolidationHistoryItem[] = consolidations
    .slice(0, limit)
    .map((m) => {
      const sourceLinks = store.getLinks(m.id, "derived_from");
      const sourceIds = sourceLinks
        .filter((l) => l.sourceId === m.id)
        .map((l) => l.targetId);

      return {
        id: m.id,
        text: m.text,
        memoryType: m.memoryType,
        tags: m.tags,
        status: m.status,
        consolidationVersion: m.consolidationVersion ?? 1,
        createdAt: m.createdAt.toISOString(),
        sourceCount: sourceIds.length,
        sourceIds,
      };
    });

  return NextResponse.json({
    consolidations: historyItems,
    total: consolidations.length,
  });
}
