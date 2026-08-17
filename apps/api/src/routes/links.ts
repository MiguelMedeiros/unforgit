import type { FastifyInstance, FastifyRequest } from "fastify";
import type { RemoteStore } from "unforgit-db";
import { createLinkSchema, linkTypeSchema } from "unforgit-shared";
import type { LinkType, Memory } from "unforgit-shared";

function hasApiKeyScope(request: FastifyRequest, memory: Memory): boolean {
  const apiKey = request.apiKey;
  return Boolean(
    apiKey?.orgId.toLowerCase() === memory.orgId.toLowerCase() &&
    (apiKey.repoId === null ||
      apiKey.repoId.toLowerCase() === memory.repoId.toLowerCase()),
  );
}

export async function linkRoutes(
  app: FastifyInstance,
  store: RemoteStore,
): Promise<void> {
  app.get<{ Querystring: { orgId?: string; repoId?: string } }>(
    "/v1/links",
    async (request, reply) => {
      const { orgId, repoId } = request.query;

      if (!orgId || !repoId) {
        return reply.status(400).send({ error: "orgId and repoId are required" });
      }

      const apiKey = request.apiKey;
      const orgMatches = apiKey?.orgId.toLowerCase() === orgId.toLowerCase();
      const repoMatches =
        apiKey?.repoId === null ||
        apiKey?.repoId.toLowerCase() === repoId.toLowerCase();

      if (!orgMatches || !repoMatches) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const links = await store.getAllLinks(orgId, repoId);
      return reply.send({ links });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/memory/:id/link",
    async (request, reply) => {
      const { id } = request.params;
      const body = (request.body ?? {}) as Record<string, unknown>;

      const parsed = createLinkSchema.safeParse({
        sourceId: id,
        targetId: body.targetId,
        linkType: body.linkType,
        metadata: body.metadata,
      });

      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues });
      }

      const [source, target] = await Promise.all([
        store.getById(parsed.data.sourceId),
        store.getById(parsed.data.targetId),
      ]);
      if (!source || !target) {
        return reply.status(404).send({ error: "Memory not found" });
      }
      if (!hasApiKeyScope(request, source) || !hasApiKeyScope(request, target)) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      try {
        const link = await store.link(parsed.data);
        return reply.status(201).send({ link });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        if (msg.includes("Unique constraint")) {
          return reply.status(409).send({ error: "Link already exists" });
        }
        return reply.status(500).send({ error: msg });
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/v1/memory/:id/link",
    async (request, reply) => {
      const { id } = request.params;
      const body = (request.body ?? {}) as Record<string, unknown>;

      const targetId = body.targetId as string;
      const linkType = body.linkType as string;

      if (!targetId || !linkType) {
        return reply
          .status(400)
          .send({ error: "targetId and linkType are required" });
      }

      const typeCheck = linkTypeSchema.safeParse(linkType);
      if (!typeCheck.success) {
        return reply.status(400).send({ error: typeCheck.error.issues });
      }

      const [source, target] = await Promise.all([
        store.getById(id),
        store.getById(targetId),
      ]);
      if (!source || !target) {
        return reply.status(404).send({ error: "Memory not found" });
      }
      if (!hasApiKeyScope(request, source) || !hasApiKeyScope(request, target)) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const ok = await store.unlink(id, targetId, linkType);
      if (!ok) return reply.status(404).send({ error: "Link not found" });
      return reply.send({ ok: true });
    },
  );

  app.get<{ Params: { id: string }; Querystring: { linkType?: string } }>(
    "/v1/memory/:id/links",
    async (request, reply) => {
      const { id } = request.params;
      const { linkType } = request.query;

      if (linkType) {
        const typeCheck = linkTypeSchema.safeParse(linkType);
        if (!typeCheck.success) {
          return reply.status(400).send({ error: typeCheck.error.issues });
        }
      }

      const memory = await store.getById(id);
      if (!memory) {
        return reply.status(404).send({ error: "Memory not found" });
      }
      if (!hasApiKeyScope(request, memory)) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const links = await store.getLinks({
        memoryId: id,
        linkType: linkType as LinkType | undefined,
      });

      return reply.send({ links });
    },
  );
}
