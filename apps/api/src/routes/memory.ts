import type { FastifyInstance } from "fastify";
import { applyLifecycleDefaults } from "unforgit-core";
import type { RemoteStore } from "unforgit-db";
import { createMemorySchema } from "unforgit-shared";
import type { ListQuery } from "unforgit-shared";

function parseIntegerParam(
  value: string | undefined,
  fallback: number,
  minimum: number,
): number | undefined {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : undefined;
}

export async function memoryRoutes(
  app: FastifyInstance,
  store: RemoteStore,
  scheduleLifecycle?: (orgId: string, repoId: string) => void,
): Promise<void> {
  app.get("/v1/memories", async (request, reply) => {
    const query = request.query as Record<string, string>;

    if (!query.orgId || !query.repoId) {
      return reply.status(400).send({ error: "orgId and repoId are required" });
    }

    const limit = parseIntegerParam(query.limit, 50, 1);
    if (limit === undefined) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "limit must be a positive integer",
      });
    }

    const offset = parseIntegerParam(query.offset, 0, 0);
    if (offset === undefined) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "offset must be a non-negative integer",
      });
    }

    const listQuery: ListQuery = {
      orgId: query.orgId,
      repoId: query.repoId,
      types: query.types?.split(",").filter(Boolean) as ListQuery["types"],
      status: query.status?.split(",").filter(Boolean) as ListQuery["status"],
      visibility: query.visibility?.split(",").filter(Boolean) as ListQuery["visibility"],
      tags: query.tags?.split(",").filter(Boolean),
      search: query.search,
      limit,
      offset,
      sortBy: (query.sortBy as ListQuery["sortBy"]) ?? "createdAt",
      sortOrder: (query.sortOrder as ListQuery["sortOrder"]) ?? "desc",
    };

    const memories = await store.list(listQuery);
    const total = await store.count(listQuery);
    return reply.send({ memories, total });
  });

  app.get("/v1/memory/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const memory = await store.getById(id);
    if (!memory) {
      return reply.status(404).send({ error: "Memory not found" });
    }
    return reply.send({ memory });
  });

  app.post("/v1/memory", async (request, reply) => {
    const parsed = createMemorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const memory = await store.store(applyLifecycleDefaults(parsed.data));
    scheduleLifecycle?.(parsed.data.orgId, parsed.data.repoId);

    if (request.apiKey) {
      store.createApiKeyLog({
        apiKeyId: request.apiKey.id,
        operation: "create_memory",
        orgId: parsed.data.orgId,
        repoId: parsed.data.repoId,
        memoryId: memory.id,
      }).catch((err) => {
        app.log.error("Failed to log API key usage:", err);
      });
    }

    return reply.status(201).send({ id: memory.id });
  });
}
