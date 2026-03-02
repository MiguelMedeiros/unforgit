import type { FastifyInstance } from "fastify";
import { recallQuerySchema } from "../../core/schemas.js";
import type { RemoteStore } from "../../db/remote.js";

export async function recallRoutes(
  app: FastifyInstance,
  store: RemoteStore,
): Promise<void> {
  app.post("/v1/recall", async (request, reply) => {
    const parsed = recallQuerySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const results = await store.recall(parsed.data);
    return reply.send({ results });
  });
}
