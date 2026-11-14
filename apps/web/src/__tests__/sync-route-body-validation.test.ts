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
    remote: { url: "https://remote.test", orgId: "test-org", repoId: "test-repo" },
  }),
  getLocalStore: () => testState.store,
}));

vi.mock("@/lib/remote-headers", () => ({
  getRemoteHeaders: (headers: Record<string, string> = {}) => headers,
}));

import { POST } from "../../app/api/sync/route";

const MEMORY_ID = "22222222-2222-4222-8222-222222222222";

function syncRequest(rawBody: string): NextRequest {
  return new NextRequest("http://localhost/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("dashboard POST /api/sync request body validation", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-sync-body-"));
    testState.store = new WebLocalStore(path.join(tmpDir, "local.db"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    testState.store = null;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("rejects an unknown conflictResolution before contacting the remote", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(syncRequest(JSON.stringify({ conflictResolution: "local-wins" })));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conflictResolution/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not let an unknown conflictResolution overwrite newer local edits", async () => {
    const store = testState.store!;
    const localUpdatedAt = new Date("2026-11-10T12:00:00.000Z");
    store.upsertFromRemote({
      id: MEMORY_ID,
      orgId: "test-org",
      repoId: "test-repo",
      scopeType: "repo",
      memoryType: "semantic",
      visibility: "repo",
      status: "active",
      text: "local edit",
      tags: [],
      version: 3,
      createdAt: localUpdatedAt,
      updatedAt: localUpdatedAt,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (String(url).includes("/v1/sync/pull")) {
          return jsonResponse(200, [
            {
              id: MEMORY_ID,
              orgId: "test-org",
              repoId: "test-repo",
              scopeType: "repo",
              memoryType: "semantic",
              visibility: "repo",
              status: "active",
              text: "stale remote value",
              tags: [],
              version: 4,
              createdAt: "2026-11-01T00:00:00.000Z",
              updatedAt: "2026-11-01T00:00:00.000Z",
            },
          ]);
        }
        return jsonResponse(200, []);
      }),
    );

    await POST(syncRequest(JSON.stringify({ conflictResolution: "localWins" })));

    expect(store.getById(MEMORY_ID)?.text).toBe("local edit");
  });

  it.each(["null", "[]", '"text"'])(
    "treats a non-object JSON body (%s) as defaults instead of crashing",
    async (rawBody) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, [])));

      const res = await POST(syncRequest(rawBody));

      expect(res.status).toBe(200);
      expect((await res.json()).errors).toEqual([]);
    },
  );

  it.each(["local_wins", "remote_wins", "last_write_wins", "manual"])(
    "accepts the supported conflictResolution %s",
    async (conflictResolution) => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, [])));

      const res = await POST(syncRequest(JSON.stringify({ conflictResolution })));

      expect(res.status).toBe(200);
    },
  );
});
