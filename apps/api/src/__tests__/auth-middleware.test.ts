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
});
