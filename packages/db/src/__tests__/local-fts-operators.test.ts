import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStore } from "../local.js";

let tmpDir: string;
let store: LocalStore;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-fts-operators-"));
  store = new LocalStore(path.join(tmpDir, "local.db"));
  store.store({
    orgId: "test-org",
    repoId: "test-repo",
    memoryType: "procedural",
    visibility: "repo",
    text: "Run lint AND tests before you deploy; do NOT skip the gate or work near prod",
    tags: ["deploy"],
  });
});

afterEach(() => {
  store.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const operatorQueries = ["deploy AND tests", "do NOT skip", "lint OR deploy", "AND", "NEAR gate"];

describe("LocalStore FTS queries with FTS5 operator keywords", () => {
  it.each(operatorQueries)("recall treats %j as plain words", (query) => {
    const results = store.recall({ orgId: "test-org", repoId: "test-repo", query });
    expect(results.map((r) => r.text)).toEqual([
      "Run lint AND tests before you deploy; do NOT skip the gate or work near prod",
    ]);
  });

  it.each(operatorQueries)("list and count treat search %j as plain words", (search) => {
    const query = { orgId: "test-org", repoId: "test-repo", search };
    expect(store.list(query)).toHaveLength(1);
    expect(store.count(query)).toBe(1);
  });
});
