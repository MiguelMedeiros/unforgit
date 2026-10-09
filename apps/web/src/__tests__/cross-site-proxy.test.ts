import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

describe("dashboard DNS-rebinding protection", () => {
  const originalAllowedHosts = process.env.UNFORGIT_DASHBOARD_ALLOWED_HOSTS;

  beforeEach(() => {
    delete process.env.UNFORGIT_DASHBOARD_ALLOWED_HOSTS;
  });

  afterEach(() => {
    if (originalAllowedHosts === undefined) {
      delete process.env.UNFORGIT_DASHBOARD_ALLOWED_HOSTS;
    } else {
      process.env.UNFORGIT_DASHBOARD_ALLOWED_HOSTS = originalAllowedHosts;
    }
  });

  function rebindRequest(method: string, host: string, extra: Record<string, string> = {}) {
    return new NextRequest(`http://${host}/api/memories`, {
      method,
      headers: { host, origin: `http://${host}`, "sec-fetch-site": "same-origin", ...extra },
    });
  }

  it("blocks reads through a rebound attacker hostname", async () => {
    const response = proxy(rebindRequest("GET", "evil.example:3838"));

    expect(response?.status).toBe(403);
    await expect(response!.json()).resolves.toEqual({
      error: "Host not allowed",
    });
  });

  it("blocks same-origin-looking mutations through a rebound attacker hostname", () => {
    expect(isBlocked(proxy(rebindRequest("POST", "evil.example:3838")))).toBe(true);
    expect(isBlocked(proxy(rebindRequest("DELETE", "evil.example")))).toBe(true);
  });

  it("blocks rebound hostnames even for non-browser-looking requests", () => {
    expect(
      isBlocked(
        proxy(new NextRequest("http://evil.example:3838/api/config", { headers: { host: "evil.example:3838" } })),
      ),
    ).toBe(true);
  });

  it("allows loopback names and IP literal hosts", () => {
    for (const host of [
      "127.0.0.1:3838",
      "localhost:3838",
      "LOCALHOST",
      "[::1]:3838",
      "100.81.12.32:3838",
      "192.168.1.20",
    ]) {
      expect(proxy(rebindRequest("GET", host)), host).toBeUndefined();
      expect(proxy(rebindRequest("POST", host)), host).toBeUndefined();
    }
  });

  it("allows hostnames listed in UNFORGIT_DASHBOARD_ALLOWED_HOSTS", () => {
    process.env.UNFORGIT_DASHBOARD_ALLOWED_HOSTS = " one.tail1234.ts.net , Dashboard.Local ";

    expect(proxy(rebindRequest("GET", "one.tail1234.ts.net:3838"))).toBeUndefined();
    expect(proxy(rebindRequest("POST", "dashboard.local"))).toBeUndefined();
    expect(isBlocked(proxy(rebindRequest("GET", "evil.example:3838")))).toBe(true);
  });

  it("does not treat lookalike hostnames as IP literals or loopback", () => {
    for (const host of ["127.0.0.1.evil.example", "localhost.evil.example", "1.2.3.4.nip.io"]) {
      expect(isBlocked(proxy(rebindRequest("GET", host))), host).toBe(true);
    }
  });
});
