import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const config = {
  remote: { url: "https://stalled-remote.test", orgId: "test-org", repoId: "test-repo" },
};

vi.mock("@/lib/config", () => ({
  getConfig: () => config,
  getDbPath: () => "/nonexistent/local.db",
  getDbFileSize: () => null,
  getWorkspacePath: () => "/nonexistent",
  isInitialized: () => true,
}));

vi.mock("@/lib/stores", () => ({
  getConfig: () => config,
  getLocalStore: () => null,
}));

import { GET as getConfigRoute } from "../../app/api/config/route";
import { GET as getStatsRoute } from "../../app/api/stats/route";

/** A remote that accepts the connection but never answers unless aborted. */
function stalledFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener("abort", () => {
          reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
        });
      }),
  );
}

async function settlesWithin<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`did not settle within ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

describe("dashboard health probes against a stalled remote", () => {
  const originalOpenAIKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
    vi.stubGlobal("fetch", stalledFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalOpenAIKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenAIKey;
    }
  });

  it("GET /api/config reports disconnected instead of hanging", async () => {
    const res = await settlesWithin(getConfigRoute(), 10_000);
    const body = await res.json();

    expect(body.remoteConnected).toBe(false);
    expect(body.openaiStatus).toBe("invalid");
  }, 15_000);

  it("GET /api/stats reports remote unavailable instead of hanging", async () => {
    const req = new NextRequest("http://localhost/api/stats");
    const res = await settlesWithin(getStatsRoute(req), 10_000);
    const body = await res.json();

    expect(body.remoteAvailable).toBe(false);
  }, 15_000);
});
