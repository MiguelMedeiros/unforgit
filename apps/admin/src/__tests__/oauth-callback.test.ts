import { describe, expect, it } from "vitest";
import { getOAuthTokenFromHash, urlWithoutHash } from "../../lib/oauth-callback";

describe("OAuth callback URL handling", () => {
  it("reads the bearer token from the URL fragment", () => {
    expect(getOAuthTokenFromHash("#token=header.payload.signature")).toBe(
      "header.payload.signature",
    );
  });

  it("does not accept bearer tokens from the query string", () => {
    expect(getOAuthTokenFromHash("#error=denied")).toBeNull();
  });

  it("builds a callback URL without the credential-bearing fragment", () => {
    expect(urlWithoutHash("/auth/callback", "?next=%2Frepos")).toBe(
      "/auth/callback?next=%2Frepos",
    );
  });
});
