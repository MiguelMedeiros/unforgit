import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";
import { linkRoutes } from "../routes/links.js";

function buildStore() {
  return {
    getAllLinks: vi.fn(),
    getById: vi.fn(),
    getLinks: vi.fn(),
    link: vi.fn(),
    unlink: vi.fn(),
    validateApiKey: vi.fn().mockResolvedValue({
      id: "key-id",
      orgId: "org-a",
      repoId: "repo-a",
      name: "test-key",
    }),
  } as unknown as RemoteStore & {
    getAllLinks: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    getLinks: ReturnType<typeof vi.fn>;
    link: ReturnType<typeof vi.fn>;
    unlink: ReturnType<typeof vi.fn>;
    validateApiKey: ReturnType<typeof vi.fn>;
  };
}

async function buildLinksApp(store: RemoteStore) {
  const app = Fastify();
  app.addHook("onRequest", createAuthMiddleware(store));
  await linkRoutes(app, store);
  return app;
}

describe("link routes", () => {
  it.each(["POST", "DELETE"] as const)(
    "rejects a missing %s body before calling the store",
    async (method) => {
      const store = buildStore();
      const app = await buildLinksApp(store);

      const response = await app.inject({
        method,
        url: "/v1/memory/source-id/link",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(400);
      expect(store.link).not.toHaveBeenCalled();
      expect(store.unlink).not.toHaveBeenCalled();

      await app.close();
    },
  );

  it("does not let a repository-scoped API key list another repository's links", async () => {
    const store = buildStore();
    const app = await buildLinksApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/links?orgId=org-a&repoId=repo-b",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.getAllLinks).not.toHaveBeenCalled();

    await app.close();
  });

  it("does not let a repository-scoped API key read another repository's memory links", async () => {
    const store = buildStore();
    store.getById.mockResolvedValue({
      id: "memory-id",
      orgId: "org-a",
      repoId: "repo-b",
    });
    const app = await buildLinksApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/memory/memory-id/links",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.getLinks).not.toHaveBeenCalled();

    await app.close();
  });

  it.each(["POST", "DELETE"] as const)(
    "does not let a repository-scoped API key use %s to mutate another repository's links",
    async (method) => {
      const store = buildStore();
      store.getById.mockImplementation(async (id: string) => ({
        id,
        orgId: "org-a",
        repoId: id === "source-id" ? "repo-a" : "repo-b",
      }));
      const app = await buildLinksApp(store);

      const response = await app.inject({
        method,
        url: "/v1/memory/source-id/link",
        headers: { authorization: "Bearer valid-token" },
        payload: { targetId: "target-id", linkType: "related_to" },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ error: "Forbidden" });
      expect(store.link).not.toHaveBeenCalled();
      expect(store.unlink).not.toHaveBeenCalled();

      await app.close();
    },
  );
});