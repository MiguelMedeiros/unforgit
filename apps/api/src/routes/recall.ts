import type { FastifyInstance } from "fastify";
import { resolveLifecycleConfig, generateEmbedding, isOpenAIConfigured } from "@unforgit/core";
import { recallQuerySchema } from "@unforgit/shared";
import type { RemoteStore } from "@unforgit/db";

export async function recallRoutes(
  app: FastifyInstance,
  store: RemoteStore,
  scheduleLifecycle?: (orgId: string, repoId: string) => void,
): Promise<void> {
  app.post("/v1/recall", async (request, reply) => {
    const usageTrackingLimit = resolveLifecycleConfig().usageBoost.topKToRecord;
    const parsed = recallQuerySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const query = parsed.data;
    let queryEmbedding: number[] | undefined;

    if (isOpenAIConfigured() && query.query) {
      try {
        const embResult = await generateEmbedding(query.query);
        queryEmbedding = embResult.embedding;
      } catch (error) {
        app.log.warn("Failed to generate query embedding, falling back to FTS");
      }
    }

    const results = queryEmbedding
      ? await store.recallWithEmbeddings(query, queryEmbedding)
      : await store.recall(query);

    await store.recordUsageBatch(
      results.slice(0, usageTrackingLimit).map((r) => r.id),
      query.query,
      undefined
    ).catch(() => {});
    scheduleLifecycle?.(query.orgId, query.repoId);

    return reply.send({
      results,
      searchType: queryEmbedding ? "hybrid" : "fts",
    });
  });
}
