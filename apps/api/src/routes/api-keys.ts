import type { FastifyPluginAsync } from "fastify";
import { RemoteStore } from "unforgit-db";

interface CreateApiKeyBody {
  name: string;
  orgId: string;
}

interface RevokeApiKeyParams {
  id: string;
}

interface ListApiKeysQuery {
  orgId?: string;
}

function canManageOrgKeys(
  apiKey: { orgId: string; repoId: string | null } | undefined,
  orgId: string,
): boolean {
  return Boolean(
    apiKey?.repoId === null &&
      apiKey.orgId.toLowerCase() === orgId.toLowerCase(),
  );
}

export const apiKeyRoutes: FastifyPluginAsync<{ store: RemoteStore }> = async (
  app,
  { store },
) => {
  app.post<{ Body: CreateApiKeyBody }>(
    "/v1/api-keys",
    async (request, reply) => {
      const { name, orgId } = request.body ?? {};

      if (!name || !orgId) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "name and orgId are required",
        });
      }

      if (!canManageOrgKeys(request.apiKey, orgId)) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const apiKey = await store.createApiKey(name, orgId);

      return reply.status(201).send({
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        orgId: apiKey.orgId,
        message: "Store this key securely. It will not be shown again.",
      });
    },
  );

  app.get<{ Querystring: ListApiKeysQuery }>(
    "/v1/api-keys",
    async (request, reply) => {
      const { orgId } = request.query;

      const callerKey = request.apiKey;
      const callerOrgId = callerKey?.orgId;
      const requestedOrgId = orgId ?? callerOrgId;
      if (
        !callerOrgId ||
        !requestedOrgId ||
        !canManageOrgKeys(callerKey, requestedOrgId)
      ) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const keys = await store.listApiKeys(callerOrgId);

      return reply.send({
        keys: keys.map((k) => ({
          id: k.id,
          name: k.name,
          orgId: k.orgId,
          isActive: k.isActive,
          createdAt: k.createdAt.toISOString(),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        })),
      });
    },
  );

  app.delete<{ Params: RevokeApiKeyParams }>(
    "/v1/api-keys/:id",
    async (request, reply) => {
      const { id } = request.params;

      const callerKey = request.apiKey;
      if (!callerKey || !canManageOrgKeys(callerKey, callerKey.orgId)) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const organizationKeys = await store.listApiKeys(callerKey.orgId);
      if (!organizationKeys.some((key) => key.id === id)) {
        return reply.status(404).send({
          error: "Not Found",
          message: "API key not found",
        });
      }

      const success = await store.revokeApiKey(id);

      if (!success) {
        return reply.status(404).send({
          error: "Not Found",
          message: "API key not found",
        });
      }

      return reply.send({ success: true, message: "API key revoked" });
    },
  );
};
