import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebLocalStore } from "../../lib/local-store";

const TEXT = "Run lint AND tests before you deploy; do NOT skip the gate or work near prod";

describe("WebLocalStore FTS queries with FTS5 operator keywords", () => {
  let tmpDir: string;
  let store: WebLocalStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-fts-"));
    store = new WebLocalStore(path.join(tmpDir, "local.db"));
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "procedural",
      visibility: "repo",
      text: TEXT,
      tags: ["deploy"],
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const operatorQueries = ["deploy AND tests", "do NOT skip", "lint OR deploy", "AND", "NEAR gate"];

  it.each(operatorQueries)("recall treats %j as plain words", (query) => {
    const results = store.recall({ orgId: "test-org", repoId: "test-repo", query });
    expect(results.map((r) => r.text)).toEqual([TEXT]);
  });

  it.each(operatorQueries)("list and count treat search %j as plain words", (search) => {
    const query = { orgId: "test-org", repoId: "test-repo", search };
    expect(store.list(query)).toHaveLength(1);
    expect(store.count(query)).toBe(1);
  });
});
