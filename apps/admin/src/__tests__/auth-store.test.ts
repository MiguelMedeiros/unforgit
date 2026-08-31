import { describe, expect, it } from "vitest";
import { getAdminAuthState } from "../../lib/auth-state";

const storedUser = JSON.stringify({
  id: "user-1",
  githubId: 42,
  githubLogin: "octocat",
  name: "Octo Cat",
  email: null,
  avatarUrl: null,
  isAdmin: true,
});

describe("admin auth state", () => {
  it("stays unauthenticated until client storage has hydrated", () => {
    expect(getAdminAuthState(false, "token", storedUser)).toEqual({
      hydrated: false,
      isAuthenticated: false,
      user: null,
    });
  });

  it("exposes the stored user after token hydration", () => {
    expect(getAdminAuthState(true, "token", storedUser)).toEqual({
      hydrated: true,
      isAuthenticated: true,
      user: expect.objectContaining({ githubLogin: "octocat", isAdmin: true }),
    });
  });

  it("does not expose stale user data without a token", () => {
    expect(getAdminAuthState(true, null, storedUser)).toEqual({
      hydrated: true,
      isAuthenticated: false,
      user: null,
    });
  });
});
