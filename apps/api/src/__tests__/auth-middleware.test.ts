import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";

function buildStore() {
  return {
    validateApiKey: vi.fn(),
  } as unknown as RemoteStore & { validateApiKey: ReturnType<typeof vi.fn> };
}

async function buildProtectedApp(store: RemoteStore) {
  const app = Fastify();
  app.addHook("onRequest", createAuthMiddleware(store));
  app.get("/protected", async () => ({ ok: true }));
  app.get("/v1/auth/login", async () => ({ ok: true }));
  app.get("/v1/authz/protected", async () => ({ ok: true }));
  return app;
}

describe("auth middleware", () => {
  it("rejects bearer authorization headers with extra credentials", async () => {
    const store = buildStore();
    store.validateApiKey.mockResolvedValue({
      id: "key-id",
      orgId: "org-id",
      name: "test-key",
    });
    const app = await buildProtectedApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: {
        authorization: "Bearer valid-token injected-token",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      message: "Invalid Authorization header format. Expected: Bearer <token>",
    });
    expect(store.validateApiKey).not.toHaveBeenCalled();

    await app.close();
  });

  it("does not treat routes that only share a public prefix as public", async () => {
    const store = buildStore();
    const app = await buildProtectedApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/authz/protected",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      message: "Missing Authorization header",
    });
    expect(store.validateApiKey).not.toHaveBeenCalled();

    await app.close();
  });

  it("keeps actual public prefix routes public", async () => {
    const store = buildStore();
    const app = await buildProtectedApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/auth/login",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(store.validateApiKey).not.toHaveBeenCalled();

    await app.close();
  });
});
