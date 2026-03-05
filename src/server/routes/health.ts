import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { RemoteStore } from "../../db/remote.js";
import { isOpenAIConfigured } from "../../core/embeddings.js";

const healthQuerySchema = z.object({
  orgId: z.string(),
  repoId: z.string(),
});

interface HealthReport {
  overall: "healthy" | "needs_attention" | "critical";
  score: number;
  metrics: {
    totalMemories: number;
    activeMemories: number;
    deprecatedMemories: number;
    supersededMemories: number;
    embeddingCoverage: number;
    consolidationRatio: number;
    avgUsage: number;
    staleCount: number;
  };
  byType: {
    episodic: number;
    semantic: number;
    procedural: number;
  };
  recommendations: string[];
  serverCapabilities: {
    semanticSearch: boolean;
    autoConsolidation: boolean;
    autoEmbedding: boolean;
  };
}

export async function healthRoutes(
  app: FastifyInstance,
  store: RemoteStore
): Promise<void> {
  app.get("/v1/health/repo", async (request, reply) => {
    const query = request.query as Record<string, string>;
    const parsed = healthQuerySchema.safeParse(query);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const { orgId, repoId } = parsed.data;

    const [stats, embeddingStats, usageStats, activeMemories] = await Promise.all([
      store.stats(orgId, repoId),
      store.getEmbeddingStats(orgId, repoId),
      store.getUsageStats(orgId, repoId),
      store.list({ orgId, repoId, status: ["active"], limit: 500 }),
    ]);

    const totalUsage = usageStats.reduce((sum, s) => sum + s.count, 0);
    const avgUsage = activeMemories.length > 0 
      ? totalUsage / activeMemories.length 
      : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const usageMap = new Map(usageStats.map((s) => [s.memoryId, s.count]));

    let staleCount = 0;
    let consolidatedCount = 0;

    for (const mem of activeMemories) {
      const usage = usageMap.get(mem.id) ?? 0;
      const isOld = mem.createdAt < thirtyDaysAgo;
      if (isOld && usage === 0) staleCount++;

      const sourceRefs = mem.sourceRefs as Record<string, unknown> | undefined;
      if (sourceRefs?.consolidated_from) consolidatedCount++;
    }

    const embeddingCoverage = embeddingStats.total > 0
      ? (embeddingStats.withEmbedding / embeddingStats.total) * 100
      : 100;

    const consolidationRatio = activeMemories.length > 0
      ? (consolidatedCount / activeMemories.length) * 100
      : 0;

    const staleRatio = activeMemories.length > 0
      ? (staleCount / activeMemories.length) * 100
      : 0;

    let score = 100;
    const recommendations: string[] = [];

    if (embeddingCoverage < 50) {
      score -= 20;
      recommendations.push(
        `Low embedding coverage (${embeddingCoverage.toFixed(0)}%). Run POST /v1/embeddings/backfill to enable semantic search.`
      );
    } else if (embeddingCoverage < 80) {
      score -= 10;
      recommendations.push(
        `Embedding coverage at ${embeddingCoverage.toFixed(0)}%. Consider backfilling remaining memories.`
      );
    }

    if (stats.byType.episodic > stats.byType.semantic * 2) {
      score -= 15;
      recommendations.push(
        `High episodic-to-semantic ratio. Consider consolidating episodic memories into semantic.`
      );
    }

    if (staleRatio > 30) {
      score -= 15;
      recommendations.push(
        `${staleCount} stale memories (${staleRatio.toFixed(0)}% old with no usage). Consider deprecating or consolidating.`
      );
    } else if (staleRatio > 15) {
      score -= 5;
    }

    if (consolidationRatio < 10 && activeMemories.length > 20) {
      score -= 10;
      recommendations.push(
        `Low consolidation ratio. Use POST /v1/auto-consolidate to merge similar memories.`
      );
    }

    if (stats.byStatus.deprecated > stats.byStatus.active * 0.5) {
      score -= 5;
      recommendations.push(
        `High number of deprecated memories. Consider cleanup.`
      );
    }

    if (!isOpenAIConfigured()) {
      recommendations.push(
        `OpenAI API key not configured. Server-side semantic search and auto-consolidation are disabled.`
      );
    }

    let overall: "healthy" | "needs_attention" | "critical";
    if (score >= 80) {
      overall = "healthy";
    } else if (score >= 50) {
      overall = "needs_attention";
    } else {
      overall = "critical";
    }

    const report: HealthReport = {
      overall,
      score: Math.max(0, score),
      metrics: {
        totalMemories: stats.total,
        activeMemories: stats.byStatus.active,
        deprecatedMemories: stats.byStatus.deprecated,
        supersededMemories: stats.byStatus.superseded,
        embeddingCoverage: Math.round(embeddingCoverage),
        consolidationRatio: Math.round(consolidationRatio),
        avgUsage: Math.round(avgUsage * 10) / 10,
        staleCount,
      },
      byType: stats.byType,
      recommendations,
      serverCapabilities: {
        semanticSearch: isOpenAIConfigured(),
        autoConsolidation: isOpenAIConfigured(),
        autoEmbedding: process.env.AUTO_EMBEDDING_ENABLED === "true",
      },
    };

    return reply.send(report);
  });
}
