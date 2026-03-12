import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import type { RemoteStore } from "@unforgit/db";

declare module "fastify" {
  interface FastifyRequest {
    apiKey?: {
      id: string;
      orgId: string;
      name: string;
    };
  }
}

const PUBLIC_ROUTES = ["/health"];
const PUBLIC_PREFIXES = ["/v1/admin", "/v1/auth"];

export function createAuthMiddleware(store: RemoteStore) {
  return async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const urlPath = request.url.split("?")[0];
    
    if (PUBLIC_ROUTES.includes(urlPath) || PUBLIC_PREFIXES.some(prefix => urlPath.startsWith(prefix))) {
      return;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      reply.status(401).send({
        error: "Unauthorized",
        message: "Missing Authorization header",
      });
      return;
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !token) {
      reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid Authorization header format. Expected: Bearer <token>",
      });
      return;
    }

    const apiKeyData = await store.validateApiKey(token);

    if (!apiKeyData) {
      reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid or inactive API key",
      });
      return;
    }

    request.apiKey = apiKeyData;
  };
}

export function registerAuthMiddleware(app: FastifyInstance, store: RemoteStore): void {
  app.addHook("onRequest", createAuthMiddleware(store));
}
