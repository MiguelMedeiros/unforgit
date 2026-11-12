import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { WebLocalStore } from "../../lib/local-store";

const testState = vi.hoisted(() => ({ store: null as unknown }));

vi.mock("@/lib/remote-headers", () => ({ getRemoteHeaders: () => ({}) }));

vi.mock("@/lib/stores", () => ({
  getConfig: () => ({ remote: { orgId: "test-org", repoId: "test-repo" } }),
  getLocalStore: () => testState.store,
}));

import { POST as createMemory } from "../../app/api/memories/route";
import { DELETE as deleteMemory } from "../../app/api/memories/[id]/route";
import { POST as deprecateMemory } from "../../app/api/memories/[id]/deprecate/route";

let tmpDir: string;
let store: WebLocalStore;

function request(url: string, method: string, body: string) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    body,
    headers: { "content-type": "application/json" },
  });
}

function create(body: string) {
  return createMemory(request("/api/memories", "POST", body));
}

function countMemories(): number {
  return store.list({ orgId: "test-org", repoId: "test-repo", limit: 1000, offset: 0 }).length;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-memory-body-"));
  store = new WebLocalStore(path.join(tmpDir, "local.db"));
  testState.store = store;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("POST /api/memories body validation", () => {
  it("returns 400 for a malformed JSON body", async () => {
    const res = await create("{not json");
    expect(res.status).toBe(400);
    expect(countMemories()).toBe(0);
  });

  it.each([
    ["a null body", null],
    ["an array body", []],
    ["missing text", {}],
    ["non-string text", { text: 42 }],
    ["blank text", { text: "   " }],
    ["an unknown memoryType", { text: "fact", memoryType: "invalid" }],
    ["an unknown visibility", { text: "fact", visibility: "public" }],
    ["non-array tags", { text: "fact", tags: "auth" }],
    ["non-string tag entries", { text: "fact", tags: ["ok", 7] }],
    ["non-string summary", { text: "fact", summary: 5 }],
    ["non-numeric confidence", { text: "fact", confidence: "high" }],
    ["out-of-range confidence", { text: "fact", confidence: 1.5 }],
    ["non-object sourceRefs", { text: "fact", sourceRefs: "file.ts" }],
  ])("returns 400 for %s without storing a memory", async (_label, body) => {
    const res = await create(JSON.stringify(body));
    expect(res.status).toBe(400);
    expect(countMemories()).toBe(0);
  });

  it("stores a valid memory with defaults", async () => {
    const res = await create(JSON.stringify({ text: "UTC timestamps everywhere" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.memory.text).toBe("UTC timestamps everywhere");
    expect(data.memory.memoryType).toBe("episodic");
    expect(data.memory.tags).toEqual([]);
  });

  it("stores a fully specified valid memory", async () => {
    const res = await create(
      JSON.stringify({
        text: "Deploy with make release",
        memoryType: "procedural",
        visibility: "repo",
        summary: "Deploy flow",
        tags: ["deploy"],
        confidence: 0.9,
        sourceRefs: { file: "Makefile" },
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.memory.memoryType).toBe("procedural");
    expect(data.memory.visibility).toBe("repo");
    expect(data.memory.tags).toEqual(["deploy"]);
    expect(data.memory.confidence).toBe(0.9);
  });
});

describe("memory mutation routes with a JSON null body", () => {
  let id: string;

  beforeEach(() => {
    id = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      visibility: "repo",
      text: "Existing fact",
      tags: [],
    }).id;
  });

  it("DELETE treats a null body as a soft delete instead of crashing", async () => {
    const res = await deleteMemory(request(`/api/memories/${id}`, "DELETE", "null"), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).action).toBe("soft_deleted");
    expect(store.getById(id)?.status).toBe("deleted");
  });

  it("deprecate treats a null body as no reason instead of crashing", async () => {
    const res = await deprecateMemory(
      request(`/api/memories/${id}/deprecate`, "POST", "null"),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(200);
    expect(store.getById(id)?.status).toBe("deprecated");
  });

  it("deprecate rejects a non-string reason", async () => {
    const res = await deprecateMemory(
      request(`/api/memories/${id}/deprecate`, "POST", JSON.stringify({ reason: 5 })),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(400);
    expect(store.getById(id)?.status).toBe("active");
  });
});
