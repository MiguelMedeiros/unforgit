import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { WebLocalStore } from "../../lib/local-store";

const testState = vi.hoisted(() => ({ store: null as unknown }));

vi.mock("@/lib/remote-headers", () => ({ getRemoteHeaders: () => ({}) }));
vi.mock("@/lib/pagination", () => import("../../lib/pagination"));

vi.mock("@/lib/stores", () => ({
  getConfig: () => ({ remote: { orgId: "test-org", repoId: "test-repo" } }),
  getLocalStore: () => testState.store,
}));

import { GET as listMemories } from "../../app/api/memories/route";
import { GET as timeline } from "../../app/api/timeline/route";

let tmpDir: string;
let store: WebLocalStore;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-pagination-"));
  store = new WebLocalStore(path.join(tmpDir, "local.db"));
  testState.store = store;
  for (let i = 0; i < 3; i++) {
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      visibility: "repo",
      text: `Pagination memory ${i}`,
      tags: [],
    });
  }
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const invalid = [
  ["limit", "abc"],
  ["limit", "-1"],
  ["limit", "0"],
  ["limit", "1.5"],
  ["offset", "abc"],
  ["offset", "-2"],
] as const;

describe("dashboard pagination params", () => {
  it.each(invalid)("/api/memories rejects %s=%s with 400", async (name, value) => {
    const res = await listMemories(
      new NextRequest(`http://localhost/api/memories?${name}=${value}`),
    );
    expect(res.status).toBe(400);
  });

  it.each(invalid)("/api/timeline rejects %s=%s with 400", async (name, value) => {
    const res = await timeline(
      new NextRequest(`http://localhost/api/timeline?${name}=${value}`),
    );
    expect(res.status).toBe(400);
  });

  it("/api/memories keeps valid pagination working", async () => {
    const res = await listMemories(
      new NextRequest("http://localhost/api/memories?limit=2&offset=1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.memories).toHaveLength(2);
    expect(body.total).toBe(3);
  });

  it("/api/timeline keeps defaults working", async () => {
    const res = await timeline(new NextRequest("http://localhost/api/timeline"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(3);
  });
});
