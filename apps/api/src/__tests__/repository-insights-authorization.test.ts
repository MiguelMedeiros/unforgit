import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";
import { embeddingRoutes } from "../routes/embeddings.js";
import { healthRoutes } from "../routes/health.js";
import { suggestionsRoutes } from "../routes/suggestions.js";

function buildStore() {
  return {
    validateApiKey: vi.fn().mockResolvedValue({
      id: "key-id",
      orgId: "org-a",
      repoId: "repo-a",
      name: "test-key",
    }),
    getById: vi.fn(),
    getEmbeddingStats: vi.fn(),
    getMemoriesWithoutEmbeddings: vi.fn(),
    getUsageStats: vi.fn(),
    stats: vi.fn(),
    list: vi.fn(),
  } as unknown as RemoteStore & {
    getById: ReturnType<typeof vi.fn>;
    getEmbeddingStats: ReturnType<typeof vi.fn>;
    getMemoriesWithoutEmbeddings: ReturnType<typeof vi.fn>;
    getUsageStats: ReturnType<typeof vi.fn>;
    stats: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
}

async function buildApp(store: RemoteStore) {
  const app = Fastify();
  app.addHook("onRequest", createAuthMiddleware(store));
  await embeddingRoutes(app, store);
  await healthRoutes(app, store);
  await suggestionsRoutes(app, store);
  return app;
}

describe("repository insight route authorization", () => {
  it("does not generate an embedding for another repository's memory", async () => {
    const store = buildStore();
    store.getById.mockResolvedValue({
      id: "memory-id",
      orgId: "org-a",
      repoId: "repo-b",
      text: "private memory",
    });
    const app = await buildApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings/generate/memory-id",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });

    await app.close();
  });

  it.each([
    ["backfill embeddings", "POST", "/v1/embeddings/backfill", {
      orgId: "org-a",
      repoId: "repo-b",
    }],
    [
      "read embedding stats",
      "GET",
      "/v1/embeddings/stats?orgId=org-a&repoId=repo-b",
      undefined,
    ],
    [
      "read suggestions",
      "GET",
      "/v1/suggestions?orgId=org-a&repoId=repo-b",
      undefined,
    ],
    [
      "read repository health",
      "GET",
      "/v1/health/repo?orgId=org-a&repoId=repo-b",
      undefined,
    ],
  ] as const)(
    "does not let a repository-scoped API key %s for another repository",
    async (_name, method, url, payload) => {
      const store = buildStore();
      const app = await buildApp(store);

      const response = await app.inject({
        method,
        url,
        headers: { authorization: "Bearer valid-token" },
        payload,
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ error: "Forbidden" });
      expect(store.getEmbeddingStats).not.toHaveBeenCalled();
      expect(store.getMemoriesWithoutEmbeddings).not.toHaveBeenCalled();
      expect(store.getUsageStats).not.toHaveBeenCalled();
      expect(store.stats).not.toHaveBeenCalled();
      expect(store.list).not.toHaveBeenCalled();

      await app.close();
    },
  );
});