import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { SignJWT } from "jose";
import { adminRoutes } from "../routes/admin.js";

function buildStore() {
  return {
    listApiKeysWithUsers: vi.fn(),
  } as unknown as RemoteStore & { listApiKeysWithUsers: ReturnType<typeof vi.fn> };
}

async function buildAdminApp(store: RemoteStore) {
  const app = Fastify();
  await app.register(adminRoutes, { store });
  return app;
}

async function signAdminToken(): Promise<string> {
  return new SignJWT({ isAdmin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

describe("admin auth", () => {
  afterEach(() => {
    delete process.env.JWT_SECRET;
    vi.restoreAllMocks();
  });

  it("rejects bearer authorization headers with extra credentials", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = buildStore();
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/admin/api-keys",
      headers: {
        authorization: `Bearer ${token} injected-token`,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      message: "Invalid Authorization header format",
    });
    expect(store.listApiKeysWithUsers).not.toHaveBeenCalled();

    await app.close();
  });
});
