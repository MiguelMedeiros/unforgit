import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { apiKeyRoutes } from "../routes/api-keys.js";

function buildStore() {
  return {
    createApiKey: vi.fn(),
  } as unknown as RemoteStore & {
    createApiKey: ReturnType<typeof vi.fn>;
  };
}

async function buildApiKeysApp(store: RemoteStore) {
  const app = Fastify();
  await apiKeyRoutes(app, { store });
  return app;
}

describe("API key routes", () => {
  it("rejects a missing create body before calling the store", async () => {
    const store = buildStore();
    const app = await buildApiKeysApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/api-keys",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Bad Request",
      message: "name and orgId are required",
    });
    expect(store.createApiKey).not.toHaveBeenCalled();

    await app.close();
  });
});
