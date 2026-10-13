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

function syncRequest(): NextRequest {
  return new NextRequest("http://localhost/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("dashboard POST /api/sync remote error reporting", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-sync-route-"));
    testState.store = new WebLocalStore(path.join(tmpDir, "local.db"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    testState.store = null;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reports rejected remote pulls instead of a silent successful sync", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(401, { error: "Invalid API key" })),
    );

    const res = await POST(syncRequest());
    const body = await res.json();

    const ids = body.errors.map((e: { id: string }) => e.id);
    expect(ids).toEqual(
      expect.arrayContaining(["tombstones-pull", "memories-pull", "links-pull"]),
    );
    expect(body.errors.find((e: { id: string }) => e.id === "memories-pull").error).toContain(
      "401",
    );
  });

  it("reports a rejected tombstone push and keeps the deletion pending", async () => {
    const store = testState.store!;
    const now = new Date();
    store.upsertFromRemote({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "test-org",
      repoId: "test-repo",
      scopeType: "repo",
      memoryType: "semantic",
      visibility: "repo",
      status: "active",
      text: "to delete",
      tags: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    store.softDelete({ id: "11111111-1111-4111-8111-111111111111", deletedBy: "tester" });
    expect(store.getUnsyncedTombstones("test-org", "test-repo")).toHaveLength(1);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const href = String(url);
        if (href.endsWith("/v1/sync/tombstones") && init?.method === "POST") {
          return jsonResponse(403, { error: "Forbidden" });
        }
        return jsonResponse(200, []);
      }),
    );

    const res = await POST(syncRequest());
    const body = await res.json();

    expect(body.deletionsPropagated).toBe(0);
    expect(body.errors).toEqual([
      { id: "11111111-1111-4111-8111-111111111111", error: expect.stringContaining("403") },
    ]);
    expect(store.getUnsyncedTombstones("test-org", "test-repo")).toHaveLength(1);
  });
});
