import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";
import { memoryRoutes } from "../routes/memory.js";

function buildStore() {
  return {
    list: vi.fn(),
    count: vi.fn(),
    getById: vi.fn(),
    validateApiKey: vi.fn().mockResolvedValue({
      id: "key-id",
      orgId: "org",
      repoId: "repo",
      name: "test-key",
    }),
  } as unknown as RemoteStore & {
    list: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    validateApiKey: ReturnType<typeof vi.fn>;
  };
}

async function buildMemoryApp(store: RemoteStore) {
  const app = Fastify();
  app.addHook("onRequest", createAuthMiddleware(store));
  await memoryRoutes(app, store);
  return app;
}

describe("memory routes", () => {
  it.each([
    ["limit", "not-a-number", "limit must be a positive integer"],
    ["offset", "-1", "offset must be a non-negative integer"],
  ])("rejects an invalid %s before querying the store", async (parameter, value, message) => {
    const store = buildStore();
    const app = await buildMemoryApp(store);

    const response = await app.inject({
      method: "GET",
      url: `/v1/memories?orgId=org&repoId=repo&${parameter}=${value}`,
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Bad Request",
      message,
    });
    expect(store.list).not.toHaveBeenCalled();
    expect(store.count).not.toHaveBeenCalled();

    await app.close();
  });

  it("does not let a repository-scoped API key read another repository's memory", async () => {
    const store = buildStore();
    store.validateApiKey.mockResolvedValue({
      id: "key-id",
      orgId: "org-a",
      repoId: "repo-a",
      name: "test-key",
    });
    store.getById.mockResolvedValue({
      id: "memory-id",
      orgId: "org-a",
      repoId: "repo-b",
      text: "private memory",
    });
    const app = await buildMemoryApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/memory/memory-id",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });

    await app.close();
  });

  it("does not let a repository-scoped API key list another repository's memories", async () => {
    const store = buildStore();
    store.validateApiKey.mockResolvedValue({
      id: "key-id",
      orgId: "org-a",
      repoId: "repo-a",
      name: "test-key",
    });
    const app = await buildMemoryApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/memories?orgId=org-a&repoId=repo-b",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.list).not.toHaveBeenCalled();
    expect(store.count).not.toHaveBeenCalled();

    await app.close();
  });
});
