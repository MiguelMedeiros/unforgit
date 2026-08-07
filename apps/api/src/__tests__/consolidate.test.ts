import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";
import { consolidateRoutes } from "../routes/consolidate.js";

describe("consolidate routes", () => {
  it("does not let a repository-scoped API key consolidate another repository", async () => {
    const store = {
      validateApiKey: vi.fn().mockResolvedValue({
        id: "key-id",
        orgId: "org-a",
        repoId: "repo-a",
        name: "test-key",
      }),
      recall: vi.fn(),
    } as unknown as RemoteStore;
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await consolidateRoutes(app, store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/consolidate",
      headers: { authorization: "Bearer valid-token" },
      payload: { orgId: "org-a", repoId: "repo-b" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.recall).not.toHaveBeenCalled();

    await app.close();
  });
});
