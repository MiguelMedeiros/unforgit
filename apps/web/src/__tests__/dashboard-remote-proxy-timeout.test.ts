import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const config = {
  remote: { url: "https://stalled-remote.test", orgId: "test-org", repoId: "test-repo" },
};

const localStore = {
  getById: () => null,
  restore: () => true,
};

vi.mock("@/lib/remote-headers", () => import("../../lib/remote-headers"));

vi.mock("@/lib/stores", () => ({
  getConfig: () => config,
  getLocalStore: () => localStore,
}));

import { GET as listMemories } from "../../app/api/memories/route";
import { GET as getMemory } from "../../app/api/memories/[id]/route";
import { POST as restoreMemory } from "../../app/api/memories/[id]/restore/route";

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

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("dashboard remote proxies against a stalled remote", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", stalledFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GET /api/memories?source=remote returns an empty page instead of hanging", async () => {
    const req = new NextRequest("http://localhost/api/memories?source=remote");
    const res = await settlesWithin(listMemories(req), 15_000);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.memories).toEqual([]);
  }, 20_000);

  it("GET /api/memories/:id?source=remote returns 404 instead of hanging", async () => {
    const req = new NextRequest("http://localhost/api/memories/m1?source=remote");
    const res = await settlesWithin(getMemory(req, params("m1")), 15_000);

    expect(res.status).toBe(404);
  }, 20_000);

  it("POST /api/memories/:id/restore keeps the local restore and does not hang on remote mirroring", async () => {
    const req = new NextRequest("http://localhost/api/memories/m1/restore", { method: "POST" });
    const res = await settlesWithin(restoreMemory(req, params("m1")), 15_000);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  }, 20_000);
});
