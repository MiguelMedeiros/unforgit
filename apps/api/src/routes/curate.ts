import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { runRemoteLifecycleMaintenance } from "@unforgit/core";
import { deprecateSchema, supersedeSchema } from "@unforgit/shared";
import type { RemoteStore } from "@unforgit/db";

const lifecycleRunSchema = z.object({
  orgId: z.string().min(1),
  repoId: z.string().min(1),
  dryRun: z.boolean().optional(),
  model: z.string().optional(),
  preserveOriginals: z.boolean().optional(),
});

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

  app.post("/v1/lifecycle/run", async (request, reply) => {
    const parsed = lifecycleRunSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const { orgId, repoId, ...options } = parsed.data;

    try {
      const result = await runRemoteLifecycleMaintenance(
        store,
        orgId,
        repoId,
        options,
      );
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({
        error: "Lifecycle maintenance failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
