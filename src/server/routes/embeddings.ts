import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { RemoteStore } from "../../db/remote.js";
import { isOpenAIConfigured } from "../../core/embeddings.js";

const backfillSchema = z.object({
  orgId: z.string(),
  repoId: z.string(),
  batchSize: z.number().int().min(1).max(50).default(10),
  limit: z.number().int().min(1).max(500).optional(),
});

export async function embeddingRoutes(
  app: FastifyInstance,
  store: RemoteStore
): Promise<void> {
  app.post("/v1/embeddings/generate/:memoryId", async (request, reply) => {
    if (!isOpenAIConfigured()) {
      return reply.status(503).send({
        error: "OpenAI API key not configured on server",
        hint: "Set OPENAI_API_KEY environment variable on the server",
      });
    }

    const { memoryId } = request.params as { memoryId: string };

    const memory = await store.getById(memoryId);
    if (!memory) {
      return reply.status(404).send({ error: "Memory not found" });
    }

    const hasExisting = await store.hasEmbedding(memoryId);
    if (hasExisting) {
      return reply.send({
        memoryId,
        status: "already_exists",
        message: "Embedding already exists for this memory",
      });
    }

    try {
      await store.generateAndStoreEmbedding(memoryId, memory.text);
      return reply.send({
        memoryId,
        status: "generated",
        message: "Embedding generated successfully",
      });
    } catch (error) {
      return reply.status(500).send({
        error: "Failed to generate embedding",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/v1/embeddings/backfill", async (request, reply) => {
    if (!isOpenAIConfigured()) {
      return reply.status(503).send({
        error: "OpenAI API key not configured on server",
        hint: "Set OPENAI_API_KEY environment variable on the server",
      });
    }

    const parsed = backfillSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const { orgId, repoId, batchSize, limit } = parsed.data;

    const memories = await store.getMemoriesWithoutEmbeddings(orgId, repoId);
    const toProcess = limit ? memories.slice(0, limit) : memories;

    if (toProcess.length === 0) {
      return reply.send({
        processed: 0,
        errors: 0,
        message: "All memories already have embeddings",
      });
    }

    let processed = 0;
    let errors = 0;
    const errorDetails: Array<{ memoryId: string; error: string }> = [];

    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (memory) => {
          try {
            await store.generateAndStoreEmbedding(memory.id, memory.text);
            processed++;
          } catch (error) {
            errors++;
            errorDetails.push({
              memoryId: memory.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );

      if (i + batchSize < toProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return reply.send({
      processed,
      errors,
      total: toProcess.length,
      remaining: memories.length - toProcess.length,
      errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 10) : undefined,
    });
  });

  app.get("/v1/embeddings/stats", async (request, reply) => {
    const query = request.query as { orgId?: string; repoId?: string };

    if (!query.orgId || !query.repoId) {
      return reply.status(400).send({
        error: "Missing required query parameters: orgId, repoId",
      });
    }

    const stats = await store.getEmbeddingStats(query.orgId, query.repoId);
    const coverage =
      stats.total > 0
        ? Math.round((stats.withEmbedding / stats.total) * 100)
        : 100;

    return reply.send({
      ...stats,
      coverage: `${coverage}%`,
      openAIConfigured: isOpenAIConfigured(),
    });
  });
}
