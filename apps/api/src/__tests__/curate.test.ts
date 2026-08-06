import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";
import { curateRoutes } from "../routes/curate.js";

describe("curate routes", () => {
  it("does not let a repository-scoped API key reset another repository", async () => {
    const store = {
      validateApiKey: vi.fn().mockResolvedValue({
        id: "key-id",
        orgId: "org-a",
        repoId: "repo-a",
        name: "test-key",
      }),
      resetAll: vi.fn().mockResolvedValue({ memories: 1 }),
    } as unknown as RemoteStore;
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await curateRoutes(app, store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/memories/reset",
      headers: { authorization: "Bearer valid-token" },
      payload: { orgId: "org-a", repoId: "repo-b" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.resetAll).not.toHaveBeenCalled();

    const ownRepoResponse = await app.inject({
      method: "POST",
      url: "/v1/memories/reset",
      headers: { authorization: "Bearer valid-token" },
      payload: { orgId: "org-a", repoId: "repo-a" },
    });

    expect(ownRepoResponse.statusCode).toBe(200);
    expect(store.resetAll).toHaveBeenCalledOnce();
    expect(store.resetAll).toHaveBeenCalledWith("org-a", "repo-a");

    await app.close();
  });

  it("does not let a repository-scoped API key run lifecycle maintenance on another repository", async () => {
    const store = {
      validateApiKey: vi.fn().mockResolvedValue({
        id: "key-id",
        orgId: "org-a",
        repoId: "repo-a",
        name: "test-key",
      }),
      list: vi.fn(),
    } as unknown as RemoteStore;
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await curateRoutes(app, store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/lifecycle/run",
      headers: { authorization: "Bearer valid-token" },
      payload: { orgId: "org-a", repoId: "repo-b", dryRun: false },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.list).not.toHaveBeenCalled();

    await app.close();
  });
});
