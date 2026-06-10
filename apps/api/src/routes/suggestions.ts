import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { RemoteStore } from "unforgit-db";
import { findConsolidationCandidatesRemote } from "unforgit-core";

interface Suggestion {
  type:
    | "consolidate"
    | "add_tags"
    | "add_links"
    | "deprecate"
    | "generate_embedding"
    | "promote";
  priority: "high" | "medium" | "low";
  memoryId?: string;
  memoryIds?: string[];
  reason: string;
  action: string;
}

const suggestionsQuerySchema = z.object({
  orgId: z.string(),
  repoId: z.string(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function suggestionsRoutes(
  app: FastifyInstance,
  store: RemoteStore
): Promise<void> {
  app.get("/v1/suggestions", async (request, reply) => {
    const query = request.query as Record<string, string>;
    const parsed = suggestionsQuerySchema.safeParse(query);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const { orgId, repoId, limit } = parsed.data;

    const suggestions: Suggestion[] = [];

    const embeddingStats = await store.getEmbeddingStats(orgId, repoId);
    if (embeddingStats.withoutEmbedding > 0) {
      const memoriesWithoutEmb = await store.getMemoriesWithoutEmbeddings(
        orgId,
        repoId
      );

      for (const mem of memoriesWithoutEmb.slice(0, 5)) {
        suggestions.push({
          type: "generate_embedding",
          priority: "medium",
          memoryId: mem.id,
          reason: `Memory lacks embedding for semantic search (${mem.text.slice(0, 50)}...)`,
          action: `POST /v1/embeddings/generate/${mem.id}`,
        });
      }

      if (embeddingStats.withoutEmbedding > 5) {
        suggestions.push({
          type: "generate_embedding",
          priority: "high",
          reason: `${embeddingStats.withoutEmbedding} memories lack embeddings. Run backfill to enable semantic search.`,
          action: `POST /v1/embeddings/backfill with orgId=${orgId}&repoId=${repoId}`,
        });
      }
    }

    try {
      const consolidationResult = await findConsolidationCandidatesRemote(
        store,
        orgId,
        repoId,
        { threshold: 0.5, maxGroups: 5 }
      );

      for (const candidate of consolidationResult.candidates) {
        suggestions.push({
          type: "consolidate",
          priority: candidate.averageScore > 0.7 ? "high" : "medium",
          memoryIds: candidate.memories.map((m) => m.id),
          reason: candidate.reason,
          action: `POST /v1/auto-consolidate/execute with sourceIds=[${candidate.memories.map((m) => `"${m.id}"`).join(", ")}]`,
        });
      }
    } catch {
      // Skip consolidation suggestions if we can't compute them
    }

    const memories = await store.list({
      orgId,
      repoId,
      status: ["active"],
      limit: 100,
    });

    for (const mem of memories) {
      if (mem.tags.length === 0) {
        suggestions.push({
          type: "add_tags",
          priority: "low",
          memoryId: mem.id,
          reason: `Memory has no tags: "${mem.text.slice(0, 50)}..."`,
          action: `Add relevant tags to improve discoverability`,
        });
      }
    }

    const usageStats = await store.getUsageStats(orgId, repoId);
    const usageMap = new Map(usageStats.map((s) => [s.memoryId, s.count]));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const mem of memories) {
      const usage = usageMap.get(mem.id) ?? 0;
      const isOld = mem.createdAt < thirtyDaysAgo;

      if (isOld && usage === 0 && mem.memoryType === "episodic") {
        suggestions.push({
          type: "deprecate",
          priority: "low",
          memoryId: mem.id,
          reason: `Old episodic memory with no usage: "${mem.text.slice(0, 50)}..."`,
          action: `Consider deprecating or consolidating this memory`,
        });
      }

      if (usage > 5 && mem.memoryType === "episodic") {
        suggestions.push({
          type: "promote",
          priority: "medium",
          memoryId: mem.id,
          reason: `Frequently used episodic memory (${usage} recalls). Consider promoting to semantic.`,
          action: `Promote to semantic type for persistence`,
        });
      }
    }

    suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return reply.send({
      suggestions: suggestions.slice(0, limit),
      total: suggestions.length,
      stats: {
        embeddingCoverage: embeddingStats.total > 0
          ? Math.round((embeddingStats.withEmbedding / embeddingStats.total) * 100)
          : 100,
        totalMemories: embeddingStats.total,
      },
    });
  });
}
