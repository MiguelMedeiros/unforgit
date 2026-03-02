import type { FastifyInstance } from "fastify";
import { createMemorySchema } from "../../core/schemas.js";
import type { RemoteStore } from "../../db/remote.js";

export async function memoryRoutes(
  app: FastifyInstance,
  store: RemoteStore,
): Promise<void> {
  app.post("/v1/memory", async (request, reply) => {
    const parsed = createMemorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const memory = await store.store(parsed.data);
    return reply.status(201).send({ id: memory.id });
  });
}
