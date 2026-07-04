import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { SignJWT } from "jose";
import { adminRoutes } from "../routes/admin.js";

function buildStore() {
  return {
    listApiKeysWithUsers: vi.fn(),
    createApiKey: vi.fn(),
    getUserById: vi.fn(),
    upsertRepoAccess: vi.fn(),
    createApiKeyForUser: vi.fn(),
    getById: vi.fn(),
  } as unknown as RemoteStore & {
    listApiKeysWithUsers: ReturnType<typeof vi.fn>;
    createApiKey: ReturnType<typeof vi.fn>;
    getUserById: ReturnType<typeof vi.fn>;
    upsertRepoAccess: ReturnType<typeof vi.fn>;
    createApiKeyForUser: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
  };
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
    delete process.env.OPENAI_API_KEY;
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

  it("returns a bad request instead of crashing when creating an API key without a body", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = buildStore();
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/admin/api-keys",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "name and orgId are required",
    });
    expect(store.createApiKey).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns a bad request instead of crashing when granting repo access without a body", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = buildStore();
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/admin/users/user-id/repos",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "orgId, repoId, and permission are required",
    });
    expect(store.getUserById).not.toHaveBeenCalled();
    expect(store.upsertRepoAccess).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns a bad request instead of crashing when creating a user API key without a body", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = buildStore();
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/admin/users/user-id/api-keys",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "name and orgId are required",
    });
    expect(store.getUserById).not.toHaveBeenCalled();
    expect(store.createApiKeyForUser).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns a bad request instead of crashing when manually consolidating without a body", async () => {
    process.env.JWT_SECRET = "test-secret";
    process.env.OPENAI_API_KEY = "sk-test";
    const store = buildStore();
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/admin/repos/org-id/repo-id/consolidation/execute",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "sourceIds must be an array with at least 2 IDs",
    });
    expect(store.getById).not.toHaveBeenCalled();

    await app.close();
    delete process.env.OPENAI_API_KEY;
  });
});
