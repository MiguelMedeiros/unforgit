import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const testState = vi.hoisted(() => ({ dbPath: "", store: null as unknown }));

vi.mock("@/lib/remote-headers", () => import("../../lib/remote-headers"));

vi.mock("@/lib/stores", async () => {
  const { WebLocalStore } = await import("../../lib/local-store");
  return {
    getConfig: () => ({
      remote: {
        url: "https://remote.example.test",
        orgId: "test-org",
        repoId: "test-repo",
      },
    }),
    getLocalStore: () => {
      testState.store ??= new WebLocalStore(testState.dbPath);
      return testState.store;
    },
  };
});

import { LocalStore } from "unforgit-db";
import { WebLocalStore } from "../../lib/local-store";
import { GET as getMemory } from "../../app/api/memories/[id]/route";
import { POST as restoreMemory } from "../../app/api/memories/[id]/restore/route";
import { POST as syncPost } from "../../app/api/sync/route";

let tmpDir: string;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-remote-path-"));
  testState.dbPath = path.join(tmpDir, "local.db");
  fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  testState.store = null;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("dashboard remote proxies encode memory IDs as one path segment", () => {
  it("memory detail cannot traverse to other remote routes or inject a query", async () => {
    const hostileId = "../memories?orgId=other-org&repoId=other-repo";

    await getMemory(
      new NextRequest("http://localhost/api/memories/x?source=remote"),
      { params: Promise.resolve({ id: hostileId }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requested = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requested.pathname).toBe(
      `/v1/memory/${encodeURIComponent(hostileId)}`,
    );
    expect(requested.search).toBe("");
  });

  it("restore propagation keeps a pulled hostile ID inside the restore path", async () => {
    const hostileId = "../../v1/sync/tombstones?x=";
    const now = new Date();
    const store = new LocalStore(testState.dbPath);
    try {
      store.upsertFromRemote({
        id: hostileId,
        orgId: "test-org",
        repoId: "test-repo",
        scopeType: "repo",
        memoryType: "semantic",
        visibility: "repo",
        status: "deleted",
        text: "pulled memory with a hostile id",
        tags: [],
        version: 1,
        deletedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    } finally {
      store.close();
    }

    const res = await restoreMemory(
      new NextRequest("http://localhost/api/memories/x/restore", { method: "POST" }),
      { params: Promise.resolve({ id: hostileId }) },
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requested = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requested.pathname).toBe(
      `/v1/memory/${encodeURIComponent(hostileId)}/restore`,
    );
    expect(requested.search).toBe("");
  });

  it("sync link push keeps a hostile source ID inside the link path", async () => {
    const hostileId = "../sync/push?x=";
    const now = new Date();
    const seed = new LocalStore(testState.dbPath);
    try {
      for (const id of [hostileId, "33333333-3333-4333-8333-333333333333"]) {
        seed.upsertFromRemote({
          id,
          orgId: "test-org",
          repoId: "test-repo",
          scopeType: "repo",
          memoryType: "semantic",
          visibility: "repo",
          status: "active",
          text: `memory ${id}`,
          tags: [],
          version: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
    } finally {
      seed.close();
    }
    const store = new WebLocalStore(testState.dbPath);
    testState.store = store;
    store.link({
      sourceId: hostileId,
      targetId: "33333333-3333-4333-8333-333333333333",
      linkType: "related_to",
    });
    fetchMock.mockImplementation(async () =>
      new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    await syncPost(
      new NextRequest("http://localhost/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );

    const linkCalls = fetchMock.mock.calls
      .map((call) => call as unknown as [string, RequestInit | undefined])
      .filter(([, init]) => init?.method === "POST" && String(init.body).includes("related_to"));
    expect(linkCalls).toHaveLength(1);
    const requested = new URL(String(linkCalls[0][0]));
    expect(requested.pathname).toBe(
      `/v1/memory/${encodeURIComponent(hostileId)}/link`,
    );
    expect(requested.search).toBe("");
  });
});
