import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RemoteStore } from "unforgit-db";
import { authRoutes, parseCookieHeader } from "../routes/auth.js";

async function buildApp() {
  const app = Fastify();
  await app.register(authRoutes, { store: {} as RemoteStore });
  return app;
}

describe("auth routes", () => {
  afterEach(() => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    vi.restoreAllMocks();
  });

  it("sets an HttpOnly OAuth state cookie that matches the GitHub redirect state", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/v1/auth/github" });

    expect(response.statusCode).toBe(302);
    const location = response.headers.location;
    const setCookie = response.headers["set-cookie"];
    expect(location).toEqual(expect.stringContaining("https://github.com/login/oauth/authorize"));
    expect(setCookie).toEqual(expect.stringContaining("unforgit_oauth_state="));
    expect(setCookie).toEqual(expect.stringContaining("HttpOnly"));
    expect(setCookie).toEqual(expect.stringContaining("SameSite=Lax"));

    const state = new URL(location as string).searchParams.get("state");
    const cookies = parseCookieHeader((setCookie as string).split(";")[0]);
    expect(cookies.unforgit_oauth_state).toBe(state);

    await app.close();
  });

  it("rejects GitHub OAuth callbacks without a matching state cookie", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/v1/auth/github/callback?code=abc&state=state-from-query",
      headers: { cookie: "unforgit_oauth_state=different-state" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ message: "Invalid OAuth state" });
    expect(response.headers["set-cookie"]).toEqual(expect.stringContaining("Max-Age=0"));
    expect(fetchSpy).not.toHaveBeenCalled();

    await app.close();
  });
});
