import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";
import { apiKeyRoutes } from "../routes/api-keys.js";

function buildStore() {
  return {
    createApiKey: vi.fn(),
    listApiKeys: vi.fn().mockResolvedValue([]),
    revokeApiKey: vi.fn(),
    validateApiKey: vi.fn(),
  } as unknown as RemoteStore & {
    createApiKey: ReturnType<typeof vi.fn>;
    listApiKeys: ReturnType<typeof vi.fn>;
    revokeApiKey: ReturnType<typeof vi.fn>;
    validateApiKey: ReturnType<typeof vi.fn>;
  };
}

async function buildApiKeysApp(store: RemoteStore) {
  const app = Fastify();
  await apiKeyRoutes(app, { store });
  return app;
}

describe("API key routes", () => {
  it("rejects a missing create body before calling the store", async () => {
    const store = buildStore();
    const app = await buildApiKeysApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/api-keys",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Bad Request",
      message: "name and orgId are required",
    });
    expect(store.createApiKey).not.toHaveBeenCalled();

    await app.close();
  });

  it("allows an organization-scoped API key to create a key for its organization", async () => {
    const store = buildStore();
    store.validateApiKey.mockResolvedValue({
      id: "org-key-id",
      orgId: "Org-A",
      repoId: null,
      name: "organization-key",
    });
    store.createApiKey.mockResolvedValue({
      id: "created-key-id",
      key: "hk_created",
      name: "new-key",
      orgId: "org-a",
    });
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await apiKeyRoutes(app, { store });

    const response = await app.inject({
      method: "POST",
      url: "/v1/api-keys",
      headers: { authorization: "Bearer valid-token" },
      payload: { name: "new-key", orgId: "org-a" },
    });

    expect(response.statusCode).toBe(201);
    expect(store.createApiKey).toHaveBeenCalledWith("new-key", "org-a");

    await app.close();
  });

  it("does not let a repository-scoped API key create an organization key", async () => {
    const store = buildStore();
    store.validateApiKey.mockResolvedValue({
      id: "repo-key-id",
      orgId: "org-a",
      repoId: "repo-a",
      name: "repository-key",
    });
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await apiKeyRoutes(app, { store });

    const response = await app.inject({
      method: "POST",
      url: "/v1/api-keys",
      headers: { authorization: "Bearer valid-token" },
      payload: { name: "escalated-key", orgId: "org-b" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.createApiKey).not.toHaveBeenCalled();

    await app.close();
  });

  it("does not let an organization key list another organization's keys", async () => {
    const store = buildStore();
    store.validateApiKey.mockResolvedValue({
      id: "org-key-id",
      orgId: "org-a",
      repoId: null,
      name: "organization-key",
    });
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await apiKeyRoutes(app, { store });

    const response = await app.inject({
      method: "GET",
      url: "/v1/api-keys?orgId=org-b",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.listApiKeys).not.toHaveBeenCalled();

    await app.close();
  });

  it("does not let an organization key revoke another organization's key", async () => {
    const store = buildStore();
    store.validateApiKey.mockResolvedValue({
      id: "org-key-id",
      orgId: "org-a",
      repoId: null,
      name: "organization-key",
    });
    store.listApiKeys.mockResolvedValue([
      { id: "org-a-key-id", orgId: "org-a" },
    ]);
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await apiKeyRoutes(app, { store });

    const response = await app.inject({
      method: "DELETE",
      url: "/v1/api-keys/org-b-key-id",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(404);
    expect(store.listApiKeys).toHaveBeenCalledWith("org-a");
    expect(store.revokeApiKey).not.toHaveBeenCalled();

    await app.close();
  });
});
