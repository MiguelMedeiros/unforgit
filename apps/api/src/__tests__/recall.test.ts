import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";
import { recallRoutes } from "../routes/recall.js";

describe("recall routes", () => {
  it("does not let a repository-scoped API key recall another repository", async () => {
    const store = {
      validateApiKey: vi.fn().mockResolvedValue({
        id: "key-id",
        orgId: "org-a",
        repoId: "repo-a",
        name: "test-key",
      }),
      recall: vi.fn(),
      recallWithEmbeddings: vi.fn(),
      recordUsageBatch: vi.fn(),
    } as unknown as RemoteStore;
    const scheduleLifecycle = vi.fn();
    const app = Fastify();
    app.addHook("onRequest", createAuthMiddleware(store));
    await recallRoutes(app, store, scheduleLifecycle);

    const response = await app.inject({
      method: "POST",
      url: "/v1/recall",
      headers: { authorization: "Bearer valid-token" },
      payload: {
        orgId: "org-a",
        repoId: "repo-b",
        query: "private memory",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.recall).not.toHaveBeenCalled();
    expect(store.recallWithEmbeddings).not.toHaveBeenCalled();
    expect(store.recordUsageBatch).not.toHaveBeenCalled();
    expect(scheduleLifecycle).not.toHaveBeenCalled();

    await app.close();
  });
});
