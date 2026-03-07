import type { FastifyInstance } from "fastify";
import { deprecateSchema, supersedeSchema } from "../../core/schemas.js";
import type { RemoteStore } from "../../db/remote.js";

export async function curateRoutes(
  app: FastifyInstance,
  store: RemoteStore,
): Promise<void> {
  app.post<{ Params: { id: string } }>(
    "/v1/memory/:id/deprecate",
    async (request, reply) => {
      const { id } = request.params;
      const parsed = deprecateSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues });
      }

      const ok = await store.deprecate(id, parsed.data.reason);
      if (!ok) return reply.status(404).send({ error: "Memory not found" });
      return reply.send({ ok: true });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/memory/:id/supersede",
    async (request, reply) => {
      const { id } = request.params;
      const parsed = supersedeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues });
      }

      const ok = await store.supersede(id, parsed.data.newId);
      if (!ok) return reply.status(404).send({ error: "Memory not found" });
      return reply.send({ ok: true });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/memory/:id/pin",
    async (request, reply) => {
      const { id } = request.params;
      const ok = await store.pin(id);
      if (!ok) return reply.status(404).send({ error: "Memory not found" });
      return reply.send({ ok: true });
    },
  );

  app.post("/v1/memories/reset", async (request, reply) => {
    const body = request.body as { orgId?: string; repoId?: string } | undefined;
    if (!body?.orgId || !body?.repoId) {
      return reply.status(400).send({ error: "orgId and repoId are required" });
    }

    const result = await store.resetAll(body.orgId, body.repoId);
    return reply.send(result);
  });
}
