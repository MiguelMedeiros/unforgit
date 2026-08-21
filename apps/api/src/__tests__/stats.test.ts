import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { createAuthMiddleware } from "../middleware/auth.js";
import { statsRoutes } from "../routes/stats.js";

function buildStore() {
  return {
    dailyCounts: vi.fn(),
    hourlyCounts: vi.fn(),
    weeklyTrend: vi.fn(),
    topTags: vi.fn(),
    stats: vi.fn(),
    validateApiKey: vi.fn().mockResolvedValue({
      id: "key-id",
      orgId: "org",
      repoId: "repo",
      name: "test-key",
    }),
  } as unknown as RemoteStore & {
    dailyCounts: ReturnType<typeof vi.fn>;
    hourlyCounts: ReturnType<typeof vi.fn>;
    weeklyTrend: ReturnType<typeof vi.fn>;
    topTags: ReturnType<typeof vi.fn>;
    stats: ReturnType<typeof vi.fn>;
  };
}

async function buildStatsApp(store: RemoteStore) {
  const app = Fastify();
  app.addHook("onRequest", createAuthMiddleware(store));
  await statsRoutes(app, store);
  return app;
}

describe("stats routes", () => {
  it("rejects malformed activity days before querying the store", async () => {
    const store = buildStore();
    const app = await buildStatsApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/stats/activity?orgId=org&repoId=repo&days=not-a-number",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Bad Request",
      message: "days must be a positive integer",
    });
    expect(store.dailyCounts).not.toHaveBeenCalled();
    expect(store.hourlyCounts).not.toHaveBeenCalled();
    expect(store.weeklyTrend).not.toHaveBeenCalled();

    await app.close();
  });

  it("rejects malformed tag limits before querying the store", async () => {
    const store = buildStore();
    const app = await buildStatsApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/stats/tags?orgId=org&repoId=repo&limit=0",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Bad Request",
      message: "limit must be a positive integer",
    });
    expect(store.topTags).not.toHaveBeenCalled();

    await app.close();
  });

  it.each([
    ["overview", "/v1/stats?orgId=org&repoId=other"],
    ["activity", "/v1/stats/activity?orgId=org&repoId=other"],
    ["tags", "/v1/stats/tags?orgId=org&repoId=other"],
  ])("does not expose %s for another repository", async (_name, url) => {
    const store = buildStore();
    const app = await buildStatsApp(store);

    const response = await app.inject({
      method: "GET",
      url,
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
    expect(store.stats).not.toHaveBeenCalled();
    expect(store.dailyCounts).not.toHaveBeenCalled();
    expect(store.topTags).not.toHaveBeenCalled();

    await app.close();
  });
});
