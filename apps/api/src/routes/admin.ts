import type {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { jwtVerify } from "jose";
import { RemoteStore } from "unforgit-db";
import {
  isOpenAIConfigured,
  findConsolidationCandidatesRemote,
  executeConsolidationRemote,
  type ConsolidationCandidate,
} from "unforgit-core";

interface CreateApiKeyBody {
  name: string;
  orgId: string;
  repoId?: string;
  userId?: string;
  label?: string;
}

interface ApiKeyParams {
  id: string;
}

interface UserParams {
  id: string;
}

interface UserRepoParams {
  id: string;
  orgId: string;
  repoId: string;
}

interface GrantRepoAccessBody {
  orgId: string;
  repoId: string;
  permission: string;
}

interface CreateUserApiKeyBody {
  name: string;
  orgId: string;
  repoId?: string;
  label?: string;
}

function getAdminSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const secret = getAdminSecret();
    const { payload } = await jwtVerify(token, secret);

    return payload.isAdmin === true;
  } catch {
    return false;
  }
}

async function adminAuthPreHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    reply
      .status(401)
      .send({ error: "Unauthorized", message: "Missing Authorization header" });
    return;
  }

  const tokenMatch = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());

  if (!tokenMatch) {
    reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid Authorization header format",
    });
    return;
  }

  const valid = await verifyAdminToken(tokenMatch[1]);

  if (!valid) {
    reply
      .status(401)
      .send({ error: "Unauthorized", message: "Invalid or expired admin token" });
    return;
  }
}

export const adminRoutes: FastifyPluginAsync<{ store: RemoteStore }> = async (
  app,
  { store },
) => {
  app.get(
    "/v1/admin/api-keys",
    { preHandler: adminAuthPreHandler },
    async (_request, reply) => {
      const keys = await store.listApiKeysWithUsers();

      return reply.send({
        keys: keys.map((k) => ({
          id: k.id,
          key: `${k.key.slice(0, 7)}${"*".repeat(8)}${k.key.slice(-8)}`,
          name: k.name,
          label: k.label,
          orgId: k.orgId,
          isActive: k.isActive,
          createdAt: k.createdAt.toISOString(),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          user: k.user
            ? {
                id: k.user.id,
                githubLogin: k.user.githubLogin,
                name: k.user.name,
              }
            : null,
        })),
      });
    },
  );

  app.post<{ Body: CreateApiKeyBody }>(
    "/v1/admin/api-keys",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { name, orgId, label } = request.body ?? {};

      if (!name || !orgId) {
        return reply
          .status(400)
          .send({ error: "Bad Request", message: "name and orgId are required" });
      }

      const apiKey = await store.createApiKey(name, orgId, label);

      return reply.status(201).send({
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        label: apiKey.label,
        orgId: apiKey.orgId,
      });
    },
  );

  app.patch<{ Params: ApiKeyParams; Body: { label?: string; toggle?: boolean } }>(
    "/v1/admin/api-keys/:id",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body || {};

      if (typeof body.label === "string") {
        const result = await store.updateApiKeyLabel(id, body.label);
        if (!result) {
          return reply
            .status(404)
            .send({ error: "Not Found", message: "API key not found" });
        }
        return reply.send({ success: true, label: result.label });
      }

      const result = await store.toggleApiKey(id);

      if (!result) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "API key not found" });
      }

      return reply.send({ success: true, isActive: result.isActive });
    },
  );

  app.delete<{ Params: ApiKeyParams }>(
    "/v1/admin/api-keys/:id",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { id } = request.params;
      const success = await store.deleteApiKey(id);

      if (!success) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "API key not found" });
      }

      return reply.send({ success: true });
    },
  );

  app.get(
    "/v1/admin/users",
    { preHandler: adminAuthPreHandler },
    async (_request, reply) => {
      const users = await store.listUsers();

      return reply.send({
        users: users.map((u) => ({
          id: u.id,
          githubId: u.githubId,
          githubLogin: u.githubLogin,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl,
          isAdmin: u.isAdmin,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        })),
      });
    },
  );

  app.get<{ Params: UserParams }>(
    "/v1/admin/users/:id",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { id } = request.params;
      const user = await store.getUserById(id);

      if (!user) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "User not found" });
      }

      const repoAccess = await store.getUserRepoAccess(id);
      const apiKeys = await store.getUserApiKeys(id);

      return reply.send({
        id: user.id,
        githubId: user.githubId,
        githubLogin: user.githubLogin,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        repos: repoAccess.map((r) => ({
          orgId: r.orgId,
          repoId: r.repoId,
          permission: r.permission,
          grantedAt: r.grantedAt.toISOString(),
        })),
        apiKeys: apiKeys.map((k) => ({
          id: k.id,
          key: `${k.key.slice(0, 7)}${"*".repeat(8)}${k.key.slice(-8)}`,
          name: k.name,
          orgId: k.orgId,
          repoId: k.repoId,
          isActive: k.isActive,
          createdAt: k.createdAt.toISOString(),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        })),
      });
    },
  );

  app.get<{ Params: UserParams }>(
    "/v1/admin/users/:id/repos",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { id } = request.params;
      const user = await store.getUserById(id);

      if (!user) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "User not found" });
      }

      const repoAccess = await store.getUserRepoAccess(id);

      return reply.send({
        repos: repoAccess.map((r) => ({
          orgId: r.orgId,
          repoId: r.repoId,
          permission: r.permission,
          grantedAt: r.grantedAt.toISOString(),
        })),
      });
    },
  );

  app.post<{ Params: UserParams; Body: GrantRepoAccessBody }>(
    "/v1/admin/users/:id/repos",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { id } = request.params;
      const { orgId, repoId, permission } = request.body ?? {};

      if (!orgId || !repoId || !permission) {
        return reply
          .status(400)
          .send({ error: "Bad Request", message: "orgId, repoId, and permission are required" });
      }

      const user = await store.getUserById(id);

      if (!user) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "User not found" });
      }

      const access = await store.upsertRepoAccess({
        userId: id,
        orgId,
        repoId,
        permission,
      });

      return reply.status(201).send({
        orgId: access.orgId,
        repoId: access.repoId,
        permission: access.permission,
        grantedAt: access.grantedAt.toISOString(),
      });
    },
  );

  app.delete<{ Params: UserRepoParams }>(
    "/v1/admin/users/:id/repos/:orgId/:repoId",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { id, orgId, repoId } = request.params;

      const success = await store.revokeRepoAccess(id, orgId, repoId);

      if (!success) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "Repo access not found" });
      }

      return reply.send({ success: true });
    },
  );

  app.post<{ Params: UserParams; Body: CreateUserApiKeyBody }>(
    "/v1/admin/users/:id/api-keys",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { id } = request.params;
      const { name, orgId, repoId, label } = request.body ?? {};

      if (!name || !orgId) {
        return reply
          .status(400)
          .send({ error: "Bad Request", message: "name and orgId are required" });
      }

      const user = await store.getUserById(id);

      if (!user) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "User not found" });
      }

      const apiKey = await store.createApiKeyForUser(
        name,
        orgId,
        repoId ?? null,
        id,
        id,
        label
      );

      return reply.status(201).send({
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        label: apiKey.label,
        orgId: apiKey.orgId,
        repoId: apiKey.repoId,
        userId: apiKey.userId,
      });
    },
  );

  app.patch<{ Params: UserParams }>(
    "/v1/admin/users/:id/admin",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { id } = request.params;
      const user = await store.getUserById(id);

      if (!user) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "User not found" });
      }

      const success = await store.setUserAdmin(id, !user.isAdmin);

      if (!success) {
        return reply
          .status(500)
          .send({ error: "Internal Server Error", message: "Failed to update user" });
      }

      return reply.send({ success: true, isAdmin: !user.isAdmin });
    },
  );

  app.delete<{ Params: UserParams }>(
    "/v1/admin/users/:id",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { id } = request.params;
      const success = await store.deleteUser(id);

      if (!success) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "User not found" });
      }

      return reply.send({ success: true });
    },
  );

  app.get(
    "/v1/admin/repos",
    { preHandler: adminAuthPreHandler },
    async (_request, reply) => {
      const repos = await store.getAllRepos();

      return reply.send({ repos });
    },
  );

  app.get<{ Params: { orgId: string; repoId: string } }>(
    "/v1/admin/repos/:orgId/:repoId/memories",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { orgId, repoId } = request.params;
      const query = request.query as Record<string, string>;

      const listQuery = {
        orgId,
        repoId,
        types: query.types?.split(",").filter(Boolean),
        status: query.status?.split(",").filter(Boolean),
        tags: query.tags?.split(",").filter(Boolean),
        search: query.search,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        offset: query.offset ? parseInt(query.offset, 10) : 0,
        sortBy: query.sortBy ?? "createdAt",
        sortOrder: query.sortOrder ?? "desc",
      };

      const memories = await store.list(listQuery);
      const total = await store.count(listQuery);

      return reply.send({ memories, total });
    },
  );

  app.get<{ Params: { orgId: string; repoId: string } }>(
    "/v1/admin/repos/:orgId/:repoId/stats",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { orgId, repoId } = request.params;
      const stats = await store.stats(orgId, repoId);

      return reply.send({ stats });
    },
  );

  app.get<{ Params: { orgId: string; repoId: string } }>(
    "/v1/admin/repos/:orgId/:repoId/stats/activity",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { orgId, repoId } = request.params;
      const query = request.query as Record<string, string>;
      const days = query.days ? parseInt(query.days, 10) : 365;

      const [dailyCounts, hourlyCounts, weeklyTrend] = await Promise.all([
        store.dailyCounts(orgId, repoId, days),
        store.hourlyCounts(orgId, repoId),
        store.weeklyTrend(orgId, repoId, 52),
      ]);

      return reply.send({ dailyCounts, hourlyCounts, weeklyTrend });
    },
  );

  app.get<{ Params: { orgId: string; repoId: string } }>(
    "/v1/admin/repos/:orgId/:repoId/stats/tags",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { orgId, repoId } = request.params;
      const query = request.query as Record<string, string>;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;

      const tags = await store.topTags(orgId, repoId, limit);

      return reply.send({ tags });
    },
  );

  app.get<{ Params: { orgId: string; repoId: string } }>(
    "/v1/admin/repos/:orgId/:repoId/links",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { orgId, repoId } = request.params;
      const links = await store.getAllLinks(orgId, repoId);

      return reply.send({ links });
    },
  );

  app.post<{ Params: { orgId: string; repoId: string } }>(
    "/v1/admin/repos/:orgId/:repoId/consolidation/candidates",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { orgId, repoId } = request.params;
      const body = (request.body ?? {}) as Record<string, unknown>;

      const threshold = typeof body.threshold === "number" ? body.threshold : 0.6;
      const maxGroups = typeof body.maxGroups === "number" ? body.maxGroups : 10;
      const minGroupSize = typeof body.minGroupSize === "number" ? body.minGroupSize : 2;

      try {
        const result = await findConsolidationCandidatesRemote(
          store,
          orgId,
          repoId,
          {
            threshold,
            maxGroups,
            minGroupSize,
            excludeConsolidations: true,
          }
        );

        const candidatesFormatted = result.candidates.map((c) => ({
          memories: c.memories.map((m) => ({
            id: m.id,
            memoryType: m.memoryType,
            text: m.text,
            tags: m.tags,
            createdAt: m.createdAt,
          })),
          reason: c.reason,
          suggestedTags: c.suggestedTags,
          averageScore: c.averageScore,
        }));

        return reply.send({
          candidates: candidatesFormatted,
          totalMemoriesScanned: result.totalMemoriesScanned,
          totalCandidateGroups: result.totalCandidateGroups,
        });
      } catch (error) {
        return reply.status(500).send({
          error: "Failed to find consolidation candidates",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  app.post<{ Params: { orgId: string; repoId: string } }>(
    "/v1/admin/repos/:orgId/:repoId/consolidation/execute",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      if (!isOpenAIConfigured()) {
        return reply.status(503).send({
          error: "OpenAI API key not configured on server",
          hint: "Set OPENAI_API_KEY environment variable for LLM-powered consolidation",
        });
      }

      const { orgId, repoId } = request.params;
      const body = (request.body ?? {}) as Record<string, unknown>;
      const sourceIds = body.sourceIds as string[] | undefined;
      const model = body.model as string | undefined;

      if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length < 2) {
        return reply.status(400).send({
          error: "sourceIds must be an array with at least 2 IDs",
        });
      }

      const memories = [];
      for (const id of sourceIds) {
        const memory = await store.getById(id);
        if (!memory) {
          return reply.status(404).send({ error: `Memory not found: ${id}` });
        }
        memories.push(memory);
      }

      const allTags = new Set<string>();
      for (const m of memories) {
        for (const tag of m.tags) {
          allTags.add(tag);
        }
      }

      const candidate: ConsolidationCandidate = {
        memories,
        reason: `Manual consolidation of ${memories.length} memories`,
        suggestedTags: Array.from(allTags),
        averageScore: 1.0,
      };

      try {
        const result = await executeConsolidationRemote(
          store,
          candidate,
          orgId,
          repoId,
          {
            model: model ?? process.env.CONSOLIDATION_MODEL,
            preserveOriginals: true,
          }
        );

        return reply.send({
          consolidatedId: result.consolidatedId,
          sourceIds: result.sourceIds,
          generatedText: result.generatedText,
          suggestedTags: result.suggestedTags,
          memoryType: result.memoryType,
        });
      } catch (error) {
        return reply.status(500).send({
          error: "Consolidation execution failed",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  app.get<{ Params: { orgId: string; repoId: string } }>(
    "/v1/admin/repos/:orgId/:repoId/consolidation/history",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { orgId, repoId } = request.params;

      try {
        const memories = await store.list({
          orgId,
          repoId,
          limit: 1000,
          offset: 0,
        });

        const consolidations = memories.filter((m) => {
          const sourceRefs = m.sourceRefs as Record<string, unknown> | undefined;
          return sourceRefs && (
            sourceRefs.consolidated_from ||
            sourceRefs.consolidatedFrom ||
            (Array.isArray(sourceRefs.source_ids) && sourceRefs.source_ids.length > 0)
          );
        });

        const formattedConsolidations = consolidations.map((m) => {
          const sourceRefs = m.sourceRefs as Record<string, unknown>;
          let sourceIds: string[] = [];
          
          if (Array.isArray(sourceRefs.consolidated_from)) {
            sourceIds = sourceRefs.consolidated_from as string[];
          } else if (Array.isArray(sourceRefs.consolidatedFrom)) {
            sourceIds = sourceRefs.consolidatedFrom as string[];
          } else if (Array.isArray(sourceRefs.source_ids)) {
            sourceIds = sourceRefs.source_ids as string[];
          }

          return {
            id: m.id,
            text: m.text,
            memoryType: m.memoryType,
            tags: m.tags,
            status: m.status,
            consolidationVersion: 1,
            createdAt: m.createdAt,
            sourceCount: sourceIds.length,
            sourceIds,
          };
        });

        formattedConsolidations.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return reply.send({
          consolidations: formattedConsolidations,
        });
      } catch (error) {
        return reply.status(500).send({
          error: "Failed to fetch consolidation history",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  app.get<{
    Querystring: {
      apiKeyId?: string;
      orgId?: string;
      repoId?: string;
      operation?: string;
      since?: string;
      until?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/v1/admin/logs",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const query = request.query;

      try {
        const filters = {
          apiKeyId: query.apiKeyId,
          orgId: query.orgId,
          repoId: query.repoId,
          operation: query.operation,
          since: query.since ? new Date(query.since) : undefined,
          until: query.until ? new Date(query.until) : undefined,
          limit: query.limit ? parseInt(query.limit, 10) : 100,
          offset: query.offset ? parseInt(query.offset, 10) : 0,
        };

        const [logs, total] = await Promise.all([
          store.getApiKeyLogs(filters),
          store.countApiKeyLogs(filters),
        ]);

        return reply.send({ logs, total });
      } catch (error) {
        return reply.status(500).send({
          error: "Failed to fetch logs",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  app.get<{
    Params: { keyId: string };
    Querystring: {
      operation?: string;
      since?: string;
      until?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/v1/admin/logs/key/:keyId",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { keyId } = request.params;
      const query = request.query;

      try {
        const filters = {
          apiKeyId: keyId,
          operation: query.operation,
          since: query.since ? new Date(query.since) : undefined,
          until: query.until ? new Date(query.until) : undefined,
          limit: query.limit ? parseInt(query.limit, 10) : 100,
          offset: query.offset ? parseInt(query.offset, 10) : 0,
        };

        const [logs, total] = await Promise.all([
          store.getApiKeyLogs(filters),
          store.countApiKeyLogs(filters),
        ]);

        return reply.send({ logs, total });
      } catch (error) {
        return reply.status(500).send({
          error: "Failed to fetch logs",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  app.get<{
    Params: { orgId: string; repoId: string };
    Querystring: {
      operation?: string;
      since?: string;
      until?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/v1/admin/logs/repo/:orgId/:repoId",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { orgId, repoId } = request.params;
      const query = request.query;

      try {
        const filters = {
          orgId,
          repoId,
          operation: query.operation,
          since: query.since ? new Date(query.since) : undefined,
          until: query.until ? new Date(query.until) : undefined,
          limit: query.limit ? parseInt(query.limit, 10) : 100,
          offset: query.offset ? parseInt(query.offset, 10) : 0,
        };

        const [logs, total] = await Promise.all([
          store.getApiKeyLogs(filters),
          store.countApiKeyLogs(filters),
        ]);

        return reply.send({ logs, total });
      } catch (error) {
        return reply.status(500).send({
          error: "Failed to fetch logs",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
};
