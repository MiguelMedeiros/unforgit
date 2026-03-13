import type {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { SignJWT, jwtVerify } from "jose";
import { RemoteStore } from "@unforgit/db";
import { verifyUserToken } from "./auth.js";

interface LoginBody {
  password: string;
}

interface CreateApiKeyBody {
  name: string;
  orgId: string;
  repoId?: string;
  userId?: string;
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
}

function getAdminSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("JWT_SECRET or ADMIN_PASSWORD environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

async function createAdminToken(): Promise<string> {
  const secret = getAdminSecret();
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const secret = getAdminSecret();
    const { payload } = await jwtVerify(token, secret);

    if (payload.role === "admin") {
      return true;
    }

    if (payload.isAdmin === true) {
      return true;
    }

    return false;
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

  const [scheme, token] = authHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid Authorization header format",
    });
    return;
  }

  const valid = await verifyAdminToken(token);

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
  app.post<{ Body: LoginBody }>(
    "/v1/admin/login",
    async (request, reply) => {
      const { password } = request.body ?? {};

      if (!password) {
        return reply
          .status(400)
          .send({ error: "Bad Request", message: "password is required" });
      }

      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminPassword) {
        return reply.status(503).send({
          error: "Service Unavailable",
          message: "Admin authentication is not configured",
        });
      }

      if (password !== adminPassword) {
        return reply
          .status(401)
          .send({ error: "Unauthorized", message: "Invalid password" });
      }

      const token = await createAdminToken();
      return reply.send({ token });
    },
  );

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
      const { name, orgId } = request.body;

      if (!name || !orgId) {
        return reply
          .status(400)
          .send({ error: "Bad Request", message: "name and orgId are required" });
      }

      const apiKey = await store.createApiKey(name, orgId);

      return reply.status(201).send({
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        orgId: apiKey.orgId,
      });
    },
  );

  app.patch<{ Params: ApiKeyParams }>(
    "/v1/admin/api-keys/:id",
    { preHandler: adminAuthPreHandler },
    async (request, reply) => {
      const { id } = request.params;
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
      const { orgId, repoId, permission } = request.body;

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
      const { name, orgId, repoId } = request.body;

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
        id
      );

      return reply.status(201).send({
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
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
};
