import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { memoryRoutes } from "../routes/memory.js";

function buildStore() {
  return {
    list: vi.fn(),
    count: vi.fn(),
  } as unknown as RemoteStore & {
    list: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
}

async function buildMemoryApp(store: RemoteStore) {
  const app = Fastify();
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
});
