import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { SignJWT } from "jose";
import { adminRoutes } from "../routes/admin.js";

function buildStore() {
  return {
    listApiKeysWithUsers: vi.fn(),
    createApiKey: vi.fn(),
    getUserById: vi.fn().mockResolvedValue({ id: "admin-user", isAdmin: true }),
    upsertRepoAccess: vi.fn(),
    createApiKeyForUser: vi.fn(),
    getById: vi.fn(),
    dailyCounts: vi.fn(),
    hourlyCounts: vi.fn(),
    weeklyTrend: vi.fn(),
    topTags: vi.fn(),
    list: vi.fn(),
    count: vi.fn(),
    getApiKeyLogs: vi.fn(),
    countApiKeyLogs: vi.fn(),
  } as unknown as RemoteStore & {
    listApiKeysWithUsers: ReturnType<typeof vi.fn>;
    createApiKey: ReturnType<typeof vi.fn>;
    getUserById: ReturnType<typeof vi.fn>;
    upsertRepoAccess: ReturnType<typeof vi.fn>;
    createApiKeyForUser: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    dailyCounts: ReturnType<typeof vi.fn>;
    hourlyCounts: ReturnType<typeof vi.fn>;
    weeklyTrend: ReturnType<typeof vi.fn>;
    topTags: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    getApiKeyLogs: ReturnType<typeof vi.fn>;
    countApiKeyLogs: ReturnType<typeof vi.fn>;
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
    .setSubject("admin-user")
    .setIssuedAt()
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

function adminAuthorization(token: string): { authorization: string } {
  return {
    authorization: String.fromCharCode(66, 101, 97, 114, 101, 114, 32) + token,
  };
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

  it.each([
    ["demoted", { id: "admin-user", isAdmin: false }],
    ["deleted", null],
  ])("rejects a valid admin token when its user was %s", async (_state, user) => {
    process.env.JWT_SECRET = "test-secret";
    const store = buildStore();
    store.getUserById.mockResolvedValue(user);
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/admin/api-keys",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(401);
    expect(store.getUserById).toHaveBeenCalledWith("admin-user");
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

  it("preserves repository scope when creating an API key", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = buildStore();
    store.createApiKey.mockResolvedValue({
      id: "created-key-id",
      key: "hk_created",
      name: "Allowed-Org/Allowed-Repo",
      label: "automation",
      orgId: "allowed-org",
      repoId: "allowed-repo",
    });
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/admin/api-keys",
      headers: adminAuthorization(token),
      payload: {
        name: "Allowed-Org/Allowed-Repo",
        orgId: "Allowed-Org",
        repoId: "Allowed-Repo",
        label: "automation",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(store.createApiKey).toHaveBeenCalledWith(
      "Allowed-Org/Allowed-Repo",
      "Allowed-Org",
      { label: "automation", repoId: "Allowed-Repo" },
    );
    expect(response.json()).toMatchObject({
      orgId: "allowed-org",
      repoId: "allowed-repo",
    });

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
    expect(store.getUserById).toHaveBeenCalledOnce();
    expect(store.getUserById).toHaveBeenCalledWith("admin-user");
    expect(store.upsertRepoAccess).not.toHaveBeenCalled();

    await app.close();
  });

  it("rejects unknown repository permission values", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = buildStore();
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/admin/users/user-id/repos",
      headers: adminAuthorization(token),
      payload: {
        orgId: "allowed-org",
        repoId: "allowed-repo",
        permission: "owner",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "permission must be read, write, or admin",
    });
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
    expect(store.getUserById).toHaveBeenCalledOnce();
    expect(store.getUserById).toHaveBeenCalledWith("admin-user");
    expect(store.createApiKeyForUser).not.toHaveBeenCalled();

    await app.close();
  });

  it("rejects invalid admin activity days before querying stats", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = buildStore();
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/admin/repos/org-id/repo-id/stats/activity?days=not-a-number",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "days must be a positive integer",
    });
    expect(store.dailyCounts).not.toHaveBeenCalled();
    expect(store.hourlyCounts).not.toHaveBeenCalled();
    expect(store.weeklyTrend).not.toHaveBeenCalled();

    await app.close();
  });

  it("rejects invalid admin tags limit before querying stats", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = buildStore();
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/admin/repos/org-id/repo-id/stats/tags?limit=0",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "limit must be a positive integer",
    });
    expect(store.topTags).not.toHaveBeenCalled();

    await app.close();
  });

  it("rejects invalid admin memory pagination before querying the store", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = buildStore();
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "GET",
      url: "/v1/admin/repos/org-id/repo-id/memories?limit=nope&offset=-1",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "Bad Request" });
    expect(store.list).not.toHaveBeenCalled();
    expect(store.count).not.toHaveBeenCalled();

    await app.close();
  });

  it.each([
    "/v1/admin/logs?since=not-a-date",
    "/v1/admin/logs/key/key-id?limit=0",
    "/v1/admin/logs/repo/org-id/repo-id?offset=-1",
  ])(
    "rejects invalid admin log filters before querying the store: %s",
    async (url) => {
      process.env.JWT_SECRET = "test-secret";
      const store = buildStore();
      const token = await signAdminToken();
      const app = await buildAdminApp(store);

      const response = await app.inject({
        method: "GET",
        url,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "Bad Request" });
      expect(store.getApiKeyLogs).not.toHaveBeenCalled();
      expect(store.countApiKeyLogs).not.toHaveBeenCalled();

      await app.close();
    },
  );

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

  it("rejects cross-repository sources before manual consolidation", async () => {
    process.env.JWT_SECRET = "test-secret";
    process.env.OPENAI_API_KEY = "sk-test";
    const store = buildStore();
    store.getById
      .mockResolvedValueOnce({
        id: "foreign-memory",
        orgId: "other-org",
        repoId: "other-repo",
        tags: [],
      })
      .mockResolvedValueOnce(null);
    const token = await signAdminToken();
    const app = await buildAdminApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/admin/repos/org-id/repo-id/consolidation/execute",
      headers: { authorization: `Bearer ${token}` },
      payload: { sourceIds: ["foreign-memory", "own-memory"] },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Memory not found: foreign-memory",
    });
    expect(store.getById).toHaveBeenCalledOnce();
    expect(store.getById).toHaveBeenCalledWith("foreign-memory");

    await app.close();
  });
});
