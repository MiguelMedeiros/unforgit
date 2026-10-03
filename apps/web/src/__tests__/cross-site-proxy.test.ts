import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "../../proxy";

function apiRequest(
  method: string,
  headers: Record<string, string> = {},
  url = "http://127.0.0.1:3838/api/memories",
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { host: "127.0.0.1:3838", ...headers },
  });
}

function isBlocked(response: Response | undefined): boolean {
  return response?.status === 403;
}

describe("dashboard cross-site request proxy", () => {
  it("applies only to dashboard API routes", () => {
    expect(config.matcher).toEqual(["/api/:path*"]);
  });

  it("blocks a cross-site text/plain POST that would bypass CORS preflight", async () => {
    const response = proxy(
      apiRequest("POST", {
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
        "content-type": "text/plain",
      }),
    );

    expect(isBlocked(response)).toBe(true);
    await expect(response!.json()).resolves.toEqual({
      error: "Cross-site requests are not allowed",
    });
  });

  it("blocks mutations whose Origin does not match the dashboard host", () => {
    expect(isBlocked(proxy(apiRequest("POST", { origin: "http://localhost:4000" })))).toBe(true);
    expect(isBlocked(proxy(apiRequest("DELETE", { origin: "null" })))).toBe(true);
  });

  it("blocks same-site but cross-origin mutations reported by the browser", () => {
    expect(
      isBlocked(
        proxy(
          apiRequest("POST", {
            origin: "http://127.0.0.1:3838",
            "sec-fetch-site": "same-site",
          }),
        ),
      ),
    ).toBe(true);
  });

  it("allows same-origin dashboard mutations", () => {
    expect(
      proxy(
        apiRequest("POST", {
          origin: "http://127.0.0.1:3838",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBeUndefined();
  });

  it("allows non-browser clients that send no Origin or Fetch Metadata", () => {
    expect(proxy(apiRequest("POST"))).toBeUndefined();
  });

  it("does not block safe read requests", () => {
    expect(
      proxy(
        apiRequest("GET", {
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBeUndefined();
  });

  it("blocks malformed Origin headers on mutations", () => {
    expect(isBlocked(proxy(apiRequest("PATCH", { origin: "not a url" })))).toBe(true);
  });
});
