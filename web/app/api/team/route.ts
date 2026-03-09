import { NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

export async function GET() {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Unforgit not initialized" },
      { status: 500 },
    );
  }

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 500 },
    );
  }

  try {
    const orgId = config.remote.orgId;
    const repoId = config.remote.repoId;

    const memories = local.list({
      orgId,
      repoId,
      status: ["active", "superseded"],
      limit: 1000,
    });

    const authorStats = new Map<string, {
      authorName: string;
      authorId: string;
      memoriesCreated: number;
      consolidationsCreated: number;
    }>();

    for (const memory of memories) {
      const authorId = memory.authorId || "unknown";
      const authorName = memory.authorName || "Unknown";

      if (!authorStats.has(authorId)) {
        authorStats.set(authorId, {
          authorName,
          authorId,
          memoriesCreated: 0,
          consolidationsCreated: 0,
        });
      }

      const stats = authorStats.get(authorId)!;
      if (memory.isConsolidation) {
        stats.consolidationsCreated++;
      } else {
        stats.memoriesCreated++;
      }
    }

    const contributors = Array.from(authorStats.values())
      .map((c) => ({
        ...c,
        totalContributions: c.memoriesCreated + c.consolidationsCreated * 2,
      }))
      .sort((a, b) => b.totalContributions - a.totalContributions);

    const topUsed = local.getTopUsedMemories(orgId, repoId, 10);
    const topMemories = topUsed.map(({ memory, usageCount }) => ({
      id: memory.id,
      text: memory.text,
      memoryType: memory.memoryType,
      tags: memory.tags,
      usageCount,
      authorName: memory.authorName,
    }));

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const memoriesThisWeek = memories.filter(
      (m) => m.createdAt >= oneWeekAgo && !m.isConsolidation
    ).length;

    const consolidationsThisWeek = memories.filter(
      (m) => m.createdAt >= oneWeekAgo && m.isConsolidation
    ).length;

    const syncSummary = local.getSyncSummary(orgId, repoId);

    return NextResponse.json({
      contributors,
      topMemories,
      stats: {
        totalMemories: memories.length,
        totalAuthors: authorStats.size,
        memoriesThisWeek,
        consolidationsThisWeek,
        pendingConflicts: syncSummary.conflicts,
      },
    });
  } catch (error) {
    console.error("Failed to get team stats:", error);
    return NextResponse.json(
      { error: "Failed to get team stats" },
      { status: 500 },
    );
  }
}
