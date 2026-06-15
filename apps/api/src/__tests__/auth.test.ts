import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { authRoutes } from "../routes/auth.js";

async function buildApp() {
  const app = Fastify();
  await app.register(authRoutes, { store: {} as RemoteStore });
  return app;
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
});
