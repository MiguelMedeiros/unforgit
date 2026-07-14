import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { linkRoutes } from "../routes/links.js";

function buildStore() {
  return {
    link: vi.fn(),
    unlink: vi.fn(),
  } as unknown as RemoteStore & {
    link: ReturnType<typeof vi.fn>;
    unlink: ReturnType<typeof vi.fn>;
  };
}

async function buildLinksApp(store: RemoteStore) {
  const app = Fastify();
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
      });

      expect(response.statusCode).toBe(400);
      expect(store.link).not.toHaveBeenCalled();
      expect(store.unlink).not.toHaveBeenCalled();

      await app.close();
    },
  );
});
