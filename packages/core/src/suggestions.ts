import type { ILocalStore } from "@unforgit/shared";
import type { Memory } from "@unforgit/shared";
import { computeQualityScore, type MemoryStats, type QualityScore } from "./quality.js";

export type SuggestionType =
  | "consolidate"
  | "deprecate"
  | "delete"
  | "add_tags"
  | "add_links"
  | "review"
  | "promote"
  | "generate_embedding";

export interface Suggestion {
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

export interface SuggestionResult {
  suggestions: Suggestion[];
  stats: {
    totalMemories: number;
    memoriesAnalyzed: number;
    suggestionsGenerated: number;
  };
}

export function generateSuggestions(
  store: ILocalStore,
  orgId: string,
  repoId: string,
  options?: {
    maxSuggestions?: number;
    includeTypes?: SuggestionType[];
  }
): SuggestionResult {
  const maxSuggestions = options?.maxSuggestions ?? 20;
  const suggestions: Suggestion[] = [];

  const memories = store.list({
    orgId,
    repoId,
    status: ["active"],
    limit: 500,
  });

  const usageStats = store.getUsageStats(orgId, repoId);
  const usageMap = new Map(usageStats.map((s) => [s.memoryId, s]));

  const memoryData: Array<{
    memory: Memory;
    stats: MemoryStats;
    quality: QualityScore;
  }> = [];

  for (const memory of memories) {
    const usage = usageMap.get(memory.id);
    const links = store.getLinks({ memoryId: memory.id });
    const hasEmbedding = store.hasEmbedding(memory.id);

    const stats: MemoryStats = {
      recallCount: usage?.count ?? 0,
      linkCount: links.length,
      hasEmbedding,
      daysSinceCreation: Math.floor(
        (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
      daysSinceLastRecall: usage
        ? Math.floor(
            (Date.now() - usage.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null,
    };

    const quality = computeQualityScore(memory, stats);

    memoryData.push({ memory, stats, quality });
  }

  const similarPairs = findSimilarMemoryPairs(store, memoryData, orgId, repoId);
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
    ({ stats, quality }) =>
      stats.daysSinceCreation > 90 &&
      stats.recallCount === 0 &&
      quality.overall < 0.5
  );

  for (const { memory } of staleMemories.slice(0, 5)) {
    suggestions.push({
      id: `deprecate-${memory.id.slice(0, 8)}`,
      type: "deprecate",
      priority: "medium",
      memoryIds: [memory.id],
      reason: "No recalls in 90+ days with low quality score",
      confidence: 0.7,
      action: {
        command: `unforgit deprecate ${memory.id}`,
        description: "Mark as deprecated",
      },
    });
  }

  const untagged = memoryData.filter(({ memory }) => memory.tags.length === 0);
  if (untagged.length > 0) {
    const ids = untagged.slice(0, 10).map(({ memory }) => memory.id);
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
    ({ stats, memory }) =>
      stats.linkCount === 0 &&
      !memory.isConsolidation &&
      stats.daysSinceCreation > 7
  );
  if (unlinked.length > 5) {
    suggestions.push({
      id: "add-links-batch",
      type: "add_links",
      priority: "low",
      memoryIds: unlinked.slice(0, 10).map(({ memory }) => memory.id),
      reason: `${unlinked.length} memories are isolated (no links)`,
      confidence: 0.8,
      action: {
        command: "unforgit web",
        description: "Open graph view to create links",
      },
    });
  }

  const withoutEmbedding = memoryData.filter(({ stats }) => !stats.hasEmbedding);
  if (withoutEmbedding.length > 0) {
    suggestions.push({
      id: "generate-embeddings",
      type: "generate_embedding",
      priority: withoutEmbedding.length > 10 ? "high" : "medium",
      memoryIds: withoutEmbedding.map(({ memory }) => memory.id),
      reason: `${withoutEmbedding.length} memories lack embeddings for semantic search`,
      confidence: 1.0,
      action: {
        command: "unforgit embeddings backfill",
        description: "Generate embeddings for all memories",
      },
    });
  }

  const popularPrivate = memoryData.filter(
    ({ memory, stats }) =>
      memory.visibility === "private" &&
      stats.recallCount >= 5
  );
  for (const { memory, stats } of popularPrivate.slice(0, 3)) {
    suggestions.push({
      id: `promote-${memory.id.slice(0, 8)}`,
      type: "promote",
      priority: "medium",
      memoryIds: [memory.id],
      reason: `Private memory with ${stats.recallCount} recalls - consider sharing with team`,
      confidence: 0.75,
      action: {
        command: `unforgit promote ${memory.id}`,
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

  return {
    suggestions: sorted,
    stats: {
      totalMemories: memories.length,
      memoriesAnalyzed: memoryData.length,
      suggestionsGenerated: sorted.length,
    },
  };
}

function findSimilarMemoryPairs(
  store: ILocalStore,
  memoryData: Array<{ memory: Memory; stats: MemoryStats }>,
  orgId: string,
  repoId: string
): Array<{ id1: string; id2: string; similarity: number }> {
  const pairs: Array<{ id1: string; id2: string; similarity: number }> = [];
  const seen = new Set<string>();

  for (const { memory } of memoryData.slice(0, 50)) {
    try {
      const similar = store.findSimilar({
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

        pairs.push({
          id1: memory.id,
          id2: match.id,
          similarity: match.score,
        });
      }
    } catch {
      continue;
    }
  }

  return pairs.sort((a, b) => b.similarity - a.similarity);
}

export function formatSuggestion(suggestion: Suggestion): string {
  const priorityEmoji = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
  };

  const lines = [
    `${priorityEmoji[suggestion.priority]} [${suggestion.type}] ${suggestion.reason}`,
    `   Confidence: ${Math.round(suggestion.confidence * 100)}%`,
    `   Memories: ${suggestion.memoryIds.map((id) => id.slice(0, 8)).join(", ")}`,
  ];

  if (suggestion.action) {
    lines.push(`   Action: ${suggestion.action.command}`);
  }

  return lines.join("\n");
}
