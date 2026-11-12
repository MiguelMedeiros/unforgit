import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { WebLocalStore } from "../../lib/local-store";

const testState = vi.hoisted(() => ({ store: null as unknown }));

// The web app's "@/" alias is not configured for vitest; map the real helper.
vi.mock("@/lib/remote-headers", () => import("../../lib/remote-headers"));

vi.mock("@/lib/stores", () => ({
  getConfig: () => ({
    remote: {
      url: "https://remote.example.test",
      orgId: "test-org",
      repoId: "test-repo",
    },
  }),
  getLocalStore: () => testState.store,
}));

import { POST as promote } from "../../app/api/memories/[id]/promote/route";

let tmpDir: string;
let store: WebLocalStore;
let fetchMock: ReturnType<typeof vi.fn>;

function storeMemory(visibility: "private" | "repo" = "private"): string {
  return store.store({
    orgId: "test-org",
    repoId: "test-repo",
    memoryType: "semantic",
    visibility,
    text: "Promote guard regression memory",
    tags: [],
  }).id;
}

function call(id: string) {
  return promote(
    new NextRequest(`http://localhost/api/memories/${id}/promote`, {
      method: "POST",
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-promote-"));
  store = new WebLocalStore(path.join(tmpDir, "local.db"));
  testState.store = store;
  fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ id: "remote-id" }), {
        status: 200,
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

describe("POST /api/memories/[id]/promote guards", () => {
  it("promotes an active private memory", async () => {
    const id = storeMemory();

    const res = await call(id);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.getById(id)?.visibility).toBe("repo");
  });

  it("refuses to publish a deleted memory to the shared remote", async () => {
    const id = storeMemory();
    store.softDelete({ id });

    const res = await call(id);

    expect(res.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getById(id)?.visibility).toBe("private");
  });

  it("refuses to publish a deprecated memory to the shared remote", async () => {
    const id = storeMemory();
    store.deprecate(id, "outdated");

    const res = await call(id);

    expect(res.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses to promote an already shared memory twice", async () => {
    const id = storeMemory("repo");

    const res = await call(id);

    expect(res.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
