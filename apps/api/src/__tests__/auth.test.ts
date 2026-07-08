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
});
