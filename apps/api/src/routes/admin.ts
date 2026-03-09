import type {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { SignJWT, jwtVerify } from "jose";
import { RemoteStore } from "@unforgit/db";

interface LoginBody {
  password: string;
}

interface CreateApiKeyBody {
  name: string;
  orgId: string;
}

interface ApiKeyParams {
  id: string;
}

function getAdminSecret(): Uint8Array {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD environment variable is required");
  }
  return new TextEncoder().encode(password);
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
    await jwtVerify(token, secret);
    return true;
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
      const keys = await store.listApiKeys();

      return reply.send({
        keys: keys.map((k) => ({
          id: k.id,
          key: `${k.key.slice(0, 7)}${"*".repeat(8)}${k.key.slice(-8)}`,
          name: k.name,
          orgId: k.orgId,
          isActive: k.isActive,
          createdAt: k.createdAt.toISOString(),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
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
};
