import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

type SuggestionType =
  | "consolidate"
  | "deprecate"
  | "add_tags"
  | "add_links"
  | "promote"
  | "generate_embedding";

interface Suggestion {
  id: string;
  type: SuggestionType;
  priority: "high" | "medium" | "low";
  memoryIds: string[];
  reason: string;
  confidence: number;
  action?: {
    command: string;
    description: string;
  };
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
  const maxSuggestions = parseInt(params.get("max") ?? "20", 10);

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 500 },
    );
  }

  try {
    const suggestions: Suggestion[] = [];
    const orgId = config.remote.orgId;
    const repoId = config.remote.repoId;

    const memories = local.list({
      orgId,
      repoId,
      status: ["active"],
      limit: 500,
    });

    const usageStats = local.getUsageStats(orgId, repoId);
    const usageMap = new Map(usageStats.map((s) => [s.memoryId, s]));

    const memoryData = memories.map((memory) => {
      const usage = usageMap.get(memory.id);
      const links = local.getLinks(memory.id);
      const hasEmbedding = local.hasEmbedding(memory.id);
      const daysSinceCreation = Math.floor(
        (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        memory,
        recallCount: usage?.count ?? 0,
        linkCount: links.length,
        hasEmbedding,
        daysSinceCreation,
        daysSinceLastRecall: usage
          ? Math.floor(
              (Date.now() - usage.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
            )
          : null,
      };
    });

    const similarPairs: Array<{ id1: string; id2: string; similarity: number }> = [];
    const seen = new Set<string>();

    for (const { memory } of memoryData.slice(0, 50)) {
      try {
        const similar = local.findSimilar({
          orgId,
          repoId,
          memoryId: memory.id,
          threshold: 0.6,
          k: 3,
        });

        for (const match of similar) {
          const pairKey = [memory.id, match.id].sort().join("-");
          if (seen.has(pairKey)) continue;
          seen.add(pairKey);

          similarPairs.push({
            id1: memory.id,
            id2: match.id,
            similarity: match.score,
          });
        }
      } catch {
        continue;
      }
    }

    similarPairs.sort((a, b) => b.similarity - a.similarity);

    for (const pair of similarPairs.slice(0, 5)) {
      suggestions.push({
        id: `consolidate-${pair.id1.slice(0, 8)}-${pair.id2.slice(0, 8)}`,
        type: "consolidate",
        priority: pair.similarity > 0.8 ? "high" : "medium",
        memoryIds: [pair.id1, pair.id2],
        reason: `These memories are ${Math.round(pair.similarity * 100)}% similar and could be merged`,
        confidence: pair.similarity,
        action: {
          command: `unforgit merge ${pair.id1} ${pair.id2}`,
          description: "Merge these memories into one",
        },
      });
    }

    const staleMemories = memoryData.filter(
      (d) => d.daysSinceCreation > 90 && d.recallCount === 0
    );

    for (const { memory } of staleMemories.slice(0, 5)) {
      suggestions.push({
        id: `deprecate-${memory.id.slice(0, 8)}`,
        type: "deprecate",
        priority: "medium",
        memoryIds: [memory.id],
        reason: "No recalls in 90+ days",
        confidence: 0.7,
        action: {
          command: `unforgit deprecate ${memory.id}`,
          description: "Mark as deprecated",
        },
      });
    }

    const untagged = memoryData.filter((d) => d.memory.tags.length === 0);
    if (untagged.length > 0) {
      const ids = untagged.slice(0, 10).map((d) => d.memory.id);
      suggestions.push({
        id: "add-tags-batch",
        type: "add_tags",
        priority: "low",
        memoryIds: ids,
        reason: `${untagged.length} memories have no tags`,
        confidence: 0.9,
        action: {
          command: "unforgit web",
          description: "Open dashboard to add tags",
        },
      });
    }

    const unlinked = memoryData.filter(
      (d) =>
        d.linkCount === 0 &&
        !d.memory.isConsolidation &&
        d.daysSinceCreation > 7
    );
    if (unlinked.length > 5) {
      suggestions.push({
        id: "add-links-batch",
        type: "add_links",
        priority: "low",
        memoryIds: unlinked.slice(0, 10).map((d) => d.memory.id),
        reason: `${unlinked.length} memories are isolated (no links)`,
        confidence: 0.8,
        action: {
          command: "unforgit web",
          description: "Open graph view to create links",
        },
      });
    }

    const withoutEmbedding = memoryData.filter((d) => !d.hasEmbedding);
    if (withoutEmbedding.length > 0) {
      suggestions.push({
        id: "generate-embeddings",
        type: "generate_embedding",
        priority: withoutEmbedding.length > 10 ? "high" : "medium",
        memoryIds: withoutEmbedding.map((d) => d.memory.id),
        reason: `${withoutEmbedding.length} memories lack embeddings for semantic search`,
        confidence: 1.0,
        action: {
          command: "unforgit embeddings backfill",
          description: "Generate embeddings for all memories",
        },
      });
    }

    const popularPrivate = memoryData.filter(
      (d) => d.memory.visibility === "private" && d.recallCount >= 5
    );
    for (const d of popularPrivate.slice(0, 3)) {
      suggestions.push({
        id: `promote-${d.memory.id.slice(0, 8)}`,
        type: "promote",
        priority: "medium",
        memoryIds: [d.memory.id],
        reason: `Private memory with ${d.recallCount} recalls - consider sharing with team`,
        confidence: 0.75,
        action: {
          command: `unforgit promote ${d.memory.id}`,
          description: "Promote to shared visibility",
        },
      });
    }

    const sorted = suggestions
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.confidence - a.confidence;
      })
      .slice(0, maxSuggestions);

    return NextResponse.json({
      suggestions: sorted,
      stats: {
        totalMemories: memories.length,
        memoriesAnalyzed: memoryData.length,
        suggestionsGenerated: sorted.length,
      },
    });
  } catch (error) {
    console.error("Failed to generate suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 },
    );
  }
}
