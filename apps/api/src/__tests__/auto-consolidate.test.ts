import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";
import { autoConsolidateRoutes } from "../routes/auto-consolidate.js";

describe("auto-consolidate routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["/v1/auto-consolidate/preview", { orgId: "org-a", repoId: "repo-b" }],
    ["/v1/auto-consolidate", { orgId: "org-a", repoId: "repo-b" }],
    [
      "/v1/auto-consolidate/execute",
      { orgId: "org-a", repoId: "repo-b", sourceIds: ["one", "two"] },
    ],
  ])(
    "does not let a repository-scoped API key access another repository through %s",
    async (url, payload) => {
      const store = {
        validateApiKey: vi.fn().mockResolvedValue({
          id: "key-id",
          orgId: "org-a",
          repoId: "repo-a",
          name: "test-key",
        }),
        list: vi.fn(),
        getById: vi.fn(),
      } as unknown as RemoteStore;
      const app = Fastify();
      app.addHook("onRequest", createAuthMiddleware(store));
      await autoConsolidateRoutes(app, store);

      const response = await app.inject({
        method: "POST",
        url,
        headers: { authorization: "Bearer valid-token" },
        payload,
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ error: "Forbidden" });
      expect(store.list).not.toHaveBeenCalled();
      expect(store.getById).not.toHaveBeenCalled();

      await app.close();
    },
  );

  it("does not consolidate source memories from outside the requested repository", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    const store = {
      validateApiKey: vi.fn().mockResolvedValue({
        id: "key-id",
        orgId: "org-a",
        repoId: "repo-a",
        name: "test-key",
      }),
      getById: vi.fn().mockResolvedValue({
        id: "foreign-memory",
        orgId: "org-a",
        repoId: "repo-b",
        text: "private",
        tags: [],
      }),
    } as unknown as RemoteStore;
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await autoConsolidateRoutes(app, store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/auto-consolidate/execute",
      headers: { authorization: "Bearer valid-token" },
      payload: {
        orgId: "org-a",
        repoId: "repo-a",
        sourceIds: ["foreign-memory", "another-memory"],
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Memory not found: foreign-memory" });
    expect(store.getById).toHaveBeenCalledTimes(1);

    await app.close();
  });
});
