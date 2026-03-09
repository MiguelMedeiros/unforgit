import type { FastifyPluginAsync } from "fastify";
import { RemoteStore } from "@unforgit/db";
import type { Memory, Tombstone } from "@unforgit/shared";

interface SyncQueryParams {
  orgId: string;
  repoId: string;
  since?: string;
}

interface TombstoneBody {
  memoryId: string;
  orgId: string;
  repoId: string;
  deletedAt: string;
  deletedBy?: string;
}

interface PushBody {
  id: string;
  orgId: string;
  repoId: string;
  scopeType?: string;
  memoryType: string;
  visibility: string;
  status: string;
  text: string;
  summary?: string;
  tags?: string[];
  sourceRefs?: Record<string, unknown>;
  confidence?: number;
  ttlSeconds?: number;
  supersedesId?: string;
  version: number;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const syncRoutes: FastifyPluginAsync<{ store: RemoteStore }> = async (
  app,
  { store },
) => {
  app.get<{ Querystring: SyncQueryParams }>(
    "/v1/sync/pull",
    async (request, reply) => {
      const { orgId, repoId, since } = request.query;

      if (!orgId || !repoId) {
        return reply.status(400).send({ error: "orgId and repoId are required" });
      }

      let memories: Memory[];
      if (since) {
        memories = await store.getModifiedSince(orgId, repoId, new Date(since));
      } else {
        memories = await store.list({
          orgId,
          repoId,
          limit: 1000,
          offset: 0,
        });
      }

      return reply.send(memories.map((m) => ({
        id: m.id,
        orgId: m.orgId,
        repoId: m.repoId,
        scopeType: m.scopeType,
        memoryType: m.memoryType,
        visibility: m.visibility,
        status: m.status,
        text: m.text,
        summary: m.summary,
        tags: m.tags,
        sourceRefs: m.sourceRefs,
        confidence: m.confidence,
        ttlSeconds: m.ttlSeconds,
        supersedesId: m.supersedesId,
        version: m.version ?? 1,
        deletedAt: m.deletedAt?.toISOString(),
        deletedBy: m.deletedBy,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })));
    },
  );

  app.post<{ Body: PushBody }>(
    "/v1/sync/push",
    async (request, reply) => {
      const body = request.body;

      const memory: Memory = {
        id: body.id,
        orgId: body.orgId,
        repoId: body.repoId,
        scopeType: (body.scopeType ?? "repo") as Memory["scopeType"],
        memoryType: body.memoryType as Memory["memoryType"],
        visibility: body.visibility as Memory["visibility"],
        status: body.status as Memory["status"],
        text: body.text,
        summary: body.summary,
        tags: body.tags ?? [],
        sourceRefs: body.sourceRefs,
        confidence: body.confidence,
        ttlSeconds: body.ttlSeconds,
        supersedesId: body.supersedesId,
        version: body.version ?? 1,
        deletedAt: body.deletedAt ? new Date(body.deletedAt) : undefined,
        deletedBy: body.deletedBy,
        createdAt: new Date(body.createdAt),
        updatedAt: new Date(body.updatedAt),
      };

      const result = await store.upsertFromLocal(memory);

      if (result.conflict) {
        const existing = await store.getById(body.id);
        return reply.status(409).send({
          conflict: true,
          remoteVersion: existing?.version ?? 1,
          remoteUpdatedAt: existing?.updatedAt.toISOString(),
        });
      }

      return reply.send({
        success: true,
        action: result.action,
      });
    },
  );

  app.get<{ Querystring: SyncQueryParams }>(
    "/v1/sync/tombstones",
    async (request, reply) => {
      const { orgId, repoId, since } = request.query;

      if (!orgId || !repoId) {
        return reply.status(400).send({ error: "orgId and repoId are required" });
      }

      const tombstones = since
        ? await store.getTombstones(orgId, repoId, new Date(since))
        : await store.getUnsyncedTombstones(orgId, repoId);

      return reply.send(tombstones.map((t) => ({
        id: t.id,
        memoryId: t.memoryId,
        orgId: t.orgId,
        repoId: t.repoId,
        deletedAt: t.deletedAt.toISOString(),
        deletedBy: t.deletedBy,
        syncedAt: t.syncedAt?.toISOString(),
      })));
    },
  );

  app.post<{ Body: TombstoneBody }>(
    "/v1/sync/tombstones",
    async (request, reply) => {
      const body = request.body;

      const tombstone: Tombstone = {
        id: crypto.randomUUID(),
        memoryId: body.memoryId,
        orgId: body.orgId,
        repoId: body.repoId,
        deletedAt: new Date(body.deletedAt),
        deletedBy: body.deletedBy,
      };

      const applied = await store.applyTombstone(tombstone);

      if (applied) {
        return reply.send({ success: true });
      }

      return reply.status(409).send({ error: "Tombstone already applied" });
    },
  );

  app.delete<{ Params: { id: string }; Body: { deletedBy?: string; hardDelete?: boolean } }>(
    "/v1/memory/:id",
    async (request, reply) => {
      const { id } = request.params;
      const { deletedBy, hardDelete } = request.body ?? {};

      if (hardDelete) {
        const success = await store.hardDelete(id);
        if (success) {
          return reply.send({ success: true, action: "hard_deleted" });
        }
        return reply.status(404).send({ error: "Memory not found" });
      }

      const success = await store.softDelete({ id, deletedBy });
      if (success) {
        return reply.send({ success: true, action: "soft_deleted" });
      }

      return reply.status(404).send({ error: "Memory not found" });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/memory/:id/restore",
    async (request, reply) => {
      const { id } = request.params;

      const success = await store.restore(id);
      if (success) {
        return reply.send({ success: true });
      }

      return reply.status(404).send({ error: "Memory not found or not deleted" });
    },
  );

  app.get<{ Querystring: SyncQueryParams }>(
    "/v1/sync/links",
    async (request, reply) => {
      const { orgId, repoId } = request.query;

      if (!orgId || !repoId) {
        return reply.status(400).send({ error: "orgId and repoId are required" });
      }

      const links = await store.getAllLinks(orgId, repoId);
      return reply.send(links.map((l) => ({
        id: l.id,
        sourceId: l.sourceId,
        targetId: l.targetId,
        linkType: l.linkType,
        metadata: l.metadata,
        createdAt: l.createdAt?.toISOString(),
      })));
    },
  );
};
