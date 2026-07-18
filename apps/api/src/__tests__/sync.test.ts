import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { syncRoutes } from "../routes/sync.js";

function buildStore() {
  return {
    upsertFromLocal: vi.fn(),
  } as unknown as RemoteStore & {
    upsertFromLocal: ReturnType<typeof vi.fn>;
  };
}

async function buildSyncApp(store: RemoteStore) {
  const app = Fastify();
  await app.register(syncRoutes, { store });
  return app;
}

describe("sync routes", () => {
  it("rejects a missing push body before calling the store", async () => {
    const store = buildStore();
    const app = await buildSyncApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/sync/push",
    });

    expect(response.statusCode).toBe(400);
    expect(store.upsertFromLocal).not.toHaveBeenCalled();

    await app.close();
  });
});
