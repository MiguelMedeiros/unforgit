import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { WebLocalStore } from "../../lib/local-store";

const testState = vi.hoisted(() => ({ store: null as unknown }));

vi.mock("@/lib/stores", () => ({
  getConfig: () => ({ remote: { orgId: "test-org", repoId: "test-repo" } }),
  getLocalStore: () => testState.store,
}));

import { POST as supersede } from "../../app/api/memories/[id]/supersede/route";

let tmpDir: string;
let store: WebLocalStore;
let oldId: string;
let newId: string;

function storeMemory(text: string): string {
  return store.store({
    orgId: "test-org",
    repoId: "test-repo",
    memoryType: "semantic",
    visibility: "repo",
    text,
    tags: [],
  }).id;
}

function call(id: string, body: string) {
  const request = new NextRequest(`http://localhost/api/memories/${id}/supersede`, {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
  return supersede(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-supersede-"));
  store = new WebLocalStore(path.join(tmpDir, "local.db"));
  testState.store = store;
  oldId = storeMemory("Old fact");
  newId = storeMemory("New fact");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("POST /api/memories/[id]/supersede validation", () => {
  it("returns 400 for a malformed JSON body", async () => {
    const res = await call(oldId, "{not json");
    expect(res.status).toBe(400);
    expect(store.getById(oldId)?.status).toBe("active");
  });

  it.each([
    ["missing", {}],
    ["non-string", { newId: 42 }],
    ["blank", { newId: "   " }],
  ])("returns 400 for a %s newId", async (_label, body) => {
    const res = await call(oldId, JSON.stringify(body));
    expect(res.status).toBe(400);
    expect(store.getById(oldId)?.status).toBe("active");
  });

  it("rejects a memory superseding itself without mutating it", async () => {
    const res = await call(oldId, JSON.stringify({ newId: oldId }));
    expect(res.status).toBe(400);
    const memory = store.getById(oldId);
    expect(memory?.status).toBe("active");
    expect(memory?.supersedesId ?? null).toBeNull();
  });

  it("returns 404 without mutating when the replacement memory does not exist", async () => {
    const res = await call(oldId, JSON.stringify({ newId: "does-not-exist" }));
    expect(res.status).toBe(404);
    expect(store.getById(oldId)?.status).toBe("active");
  });

  it("supersedes the memory when the replacement exists", async () => {
    const res = await call(oldId, JSON.stringify({ newId }));
    expect(res.status).toBe(200);
    const memory = store.getById(oldId);
    expect(memory?.status).toBe("superseded");
    expect(memory?.supersedesId).toBe(newId);
  });
});
