import Fastify from "fastify";
import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { authRoutes } from "../routes/auth.js";

async function buildApp(store: RemoteStore = {} as RemoteStore) {
  const app = Fastify();
  await app.register(authRoutes, { store });
  return app;
}

async function signUserToken(): Promise<string> {
  return new SignJWT({ githubId: 123, githubLogin: "octocat", isAdmin: false })
    .setSubject("user-id")
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
}

describe("auth routes", () => {
  afterEach(() => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    delete process.env.JWT_SECRET;
    vi.restoreAllMocks();
  });

  it("redirects with a signed OAuth state token instead of a state cookie", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/v1/auth/github" });

    expect(response.statusCode).toBe(302);
    const location = response.headers.location;
    expect(location).toEqual(expect.stringContaining("https://github.com/login/oauth/authorize"));
    expect(response.headers["set-cookie"]).toBeUndefined();

    const state = new URL(location as string).searchParams.get("state");
    expect(state).toMatch(/^eyJ/);
    expect(state?.split(".")).toHaveLength(3);

    await app.close();
  });

  it("rejects GitHub OAuth callbacks without a valid signed state", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/v1/auth/github/callback?code=abc&state=tampered-state",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ message: "Invalid OAuth state" });
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();

    await app.close();
  });

  it("revokes repository access missing from a complete GitHub refresh", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    process.env.JWT_SECRET = "test-secret";
    const store = {
      upsertUser: vi.fn().mockResolvedValue({
        id: "user-id",
        githubId: 123,
        githubLogin: "octocat",
        isAdmin: false,
      }),
      upsertRepoAccess: vi.fn(),
      getUserRepoAccess: vi.fn().mockResolvedValue([
        { orgId: "allowed-org", repoId: "current-repo", permission: "write" },
        { orgId: "stale-org", repoId: "stale-repo", permission: "write" },
      ]),
      revokeRepoAccess: vi.fn().mockResolvedValue(true),
    } as unknown as RemoteStore & {
      upsertUser: ReturnType<typeof vi.fn>;
      upsertRepoAccess: ReturnType<typeof vi.fn>;
      getUserRepoAccess: ReturnType<typeof vi.fn>;
      revokeRepoAccess: ReturnType<typeof vi.fn>;
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "github-token" })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 123,
            login: "octocat",
            name: "Octo Cat",
            email: "octocat@example.com",
            avatar_url: "https://example.com/avatar.png",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 1,
              full_name: "allowed-org/current-repo",
              owner: { login: "allowed-org" },
              name: "current-repo",
              permissions: { admin: false, push: true, pull: true },
            },
          ]),
          { status: 200 },
        ),
      );
    const app = await buildApp(store);
    const authResponse = await app.inject({ method: "GET", url: "/v1/auth/github" });
    const state = new URL(authResponse.headers.location as string).searchParams.get("state");

    const response = await app.inject({
      method: "GET",
      url: `/v1/auth/github/callback?code=abc&state=${state}`,
    });

    expect(response.statusCode).toBe(302);
    expect(store.revokeRepoAccess).toHaveBeenCalledTimes(1);
    expect(store.revokeRepoAccess).toHaveBeenCalledWith(
      "user-id",
      "stale-org",
      "stale-repo",
    );

    await app.close();
  });

  it("does not revoke repository access after an incomplete GitHub refresh", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    process.env.JWT_SECRET = "test-secret";
    const store = {
      upsertUser: vi.fn(),
      upsertRepoAccess: vi.fn(),
      getUserRepoAccess: vi.fn(),
      revokeRepoAccess: vi.fn(),
    } as unknown as RemoteStore & {
      upsertUser: ReturnType<typeof vi.fn>;
      upsertRepoAccess: ReturnType<typeof vi.fn>;
      getUserRepoAccess: ReturnType<typeof vi.fn>;
      revokeRepoAccess: ReturnType<typeof vi.fn>;
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "github-token" })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 123,
            login: "octocat",
            name: "Octo Cat",
            email: "octocat@example.com",
            avatar_url: "https://example.com/avatar.png",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("upstream failure", { status: 503 }));
    const app = await buildApp(store);
    const authResponse = await app.inject({ method: "GET", url: "/v1/auth/github" });
    const state = new URL(authResponse.headers.location as string).searchParams.get("state");

    const response = await app.inject({
      method: "GET",
      url: `/v1/auth/github/callback?code=abc&state=${state}`,
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain("error=Failed%20to%20fetch%20GitHub%20repositories");
    expect(store.upsertUser).not.toHaveBeenCalled();
    expect(store.revokeRepoAccess).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns a bad request instead of crashing when creating a user API key without a body", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = {
      createApiKeyForUser: vi.fn(),
    } as unknown as RemoteStore & {
      createApiKeyForUser: ReturnType<typeof vi.fn>;
    };
    const token = await signUserToken();
    const app = await buildApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/me/keys",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "name and orgId are required",
    });
    expect(store.createApiKeyForUser).not.toHaveBeenCalled();

    await app.close();
  });

  it("rejects user API keys scoped to a repository the user cannot access", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = {
      getUserRepoAccess: vi.fn().mockResolvedValue([
        { orgId: "allowed-org", repoId: "allowed-repo" },
      ]),
      createApiKeyForUser: vi.fn(),
    } as unknown as RemoteStore & {
      getUserRepoAccess: ReturnType<typeof vi.fn>;
      createApiKeyForUser: ReturnType<typeof vi.fn>;
    };
    const token = await signUserToken();
    const app = await buildApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/me/keys",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: "unauthorized-key",
        orgId: "victim-org",
        repoId: "private-repo",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      message: "Repository access required",
    });
    expect(store.createApiKeyForUser).not.toHaveBeenCalled();

    await app.close();
  });

  it("rejects organization-wide user API keys", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = {
      getUserRepoAccess: vi.fn(),
      createApiKeyForUser: vi.fn(),
    } as unknown as RemoteStore & {
      getUserRepoAccess: ReturnType<typeof vi.fn>;
      createApiKeyForUser: ReturnType<typeof vi.fn>;
    };
    const token = await signUserToken();
    const app = await buildApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/me/keys",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: { name: "org-key", orgId: "allowed-org" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "repoId is required for user API keys",
    });
    expect(store.getUserRepoAccess).not.toHaveBeenCalled();
    expect(store.createApiKeyForUser).not.toHaveBeenCalled();

    await app.close();
  });

  it("creates a user API key for an authorized repository", async () => {
    process.env.JWT_SECRET = "test-secret";
    const store = {
      getUserRepoAccess: vi.fn().mockResolvedValue([
        { orgId: "allowed-org", repoId: "allowed-repo" },
      ]),
      createApiKeyForUser: vi.fn().mockResolvedValue({
        id: "key-id",
        key: "hk_secret",
        name: "authorized-key",
        label: null,
        orgId: "allowed-org",
        repoId: "allowed-repo",
      }),
    } as unknown as RemoteStore & {
      getUserRepoAccess: ReturnType<typeof vi.fn>;
      createApiKeyForUser: ReturnType<typeof vi.fn>;
    };
    const token = await signUserToken();
    const app = await buildApp(store);

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/me/keys",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: "authorized-key",
        orgId: "Allowed-Org",
        repoId: "Allowed-Repo",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(store.createApiKeyForUser).toHaveBeenCalledWith(
      "authorized-key",
      "Allowed-Org",
      "Allowed-Repo",
      "user-id",
      "user-id",
      undefined
    );

    await app.close();
  });

  it.each([
    "/v1/auth/me/logs?until=not-a-date",
    "/v1/auth/me/logs/repo/allowed-org/allowed-repo?limit=0&offset=-1",
  ])(
    "rejects invalid user log filters before querying logs: %s",
    async (url) => {
      process.env.JWT_SECRET = "test-secret";
      const store = {
        getUserApiKeys: vi.fn().mockResolvedValue([
          { id: "key-id", orgId: "allowed-org", repoId: "allowed-repo" },
        ]),
        getApiKeyLogs: vi.fn(),
        countApiKeyLogs: vi.fn(),
      } as unknown as RemoteStore & {
        getUserApiKeys: ReturnType<typeof vi.fn>;
        getApiKeyLogs: ReturnType<typeof vi.fn>;
        countApiKeyLogs: ReturnType<typeof vi.fn>;
      };
      const token = await signUserToken();
      const app = await buildApp(store);

      const response = await app.inject({
        method: "GET",
        url,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "Bad Request" });
      expect(store.getUserApiKeys).not.toHaveBeenCalled();
      expect(store.getApiKeyLogs).not.toHaveBeenCalled();
      expect(store.countApiKeyLogs).not.toHaveBeenCalled();

      await app.close();
    },
  );
});
