import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { WebLocalStore } from "../../lib/local-store";

const testState = vi.hoisted(() => ({
  store: null as WebLocalStore | null,
}));

vi.mock("@/lib/stores", () => ({
  getConfig: () => ({
    remote: { url: "https://remote.test", orgId: "acme&co", repoId: "repo#1 x+y" },
  }),
  getLocalStore: () => testState.store,
}));

vi.mock("@/lib/remote-headers", () => ({
  getRemoteHeaders: (headers: Record<string, string> = {}) => headers,
}));

import { POST } from "../../app/api/sync/route";

function syncRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("dashboard POST /api/sync query encoding", () => {
  let tmpDir: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-sync-query-"));
    testState.store = new WebLocalStore(path.join(tmpDir, "local.db"));
    fetchMock = vi.fn(async () =>
      new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    testState.store = null;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function getUrls(): URL[] {
    return fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.startsWith("/v1/sync/"));
  }

  it("encodes orgId and repoId in every remote sync pull query", async () => {
    await POST(syncRequest({ lastSyncAt: "2026-11-01T00:00:00.000Z" }));

    const pulls = getUrls();
    expect(pulls.map((u) => u.pathname).sort()).toEqual([
      "/v1/sync/links",
      "/v1/sync/pull",
      "/v1/sync/tombstones",
    ]);
    for (const url of pulls) {
      expect(url.hash).toBe("");
      expect(url.searchParams.get("orgId")).toBe("acme&co");
      expect(url.searchParams.get("repoId")).toBe("repo#1 x+y");
      expect([...url.searchParams.keys()].filter((k) => k !== "since").sort()).toEqual([
        "orgId",
        "repoId",
      ]);
    }
    const pull = pulls.find((u) => u.pathname === "/v1/sync/pull")!;
    expect(pull.searchParams.get("since")).toBe("2026-11-01T00:00:00.000Z");
  });

  it("ignores an invalid lastSyncAt instead of failing the memory pull", async () => {
    const res = await POST(syncRequest({ lastSyncAt: "not-a-date" }));
    const body = await res.json();

    expect(body.errors).toEqual([]);
    const pull = getUrls().find((u) => u.pathname === "/v1/sync/pull")!;
    expect(pull.searchParams.has("since")).toBe(false);
  });
});
