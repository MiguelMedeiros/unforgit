import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTempDataDir, runCommand } from "../helpers.js";
import { LocalStore } from "unforgit-db";

describe("doctor command", () => {
  let tmp: ReturnType<typeof createTempDataDir>;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    tmp?.cleanup();
  });

  it("returns machine-readable errors and suggested fixes for uninitialized repositories", async () => {
    tmp = createTempDataDir();
    tmp.cleanup();
    process.chdir(originalCwd);

    const result = await runCommand(["doctor", "--json"]);

    expect(result.exitCode).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.summary).toMatchObject({ errors: 1, warnings: 0, ok: 0 });
    expect(payload.results[0]).toMatchObject({
      check: "initialization",
      status: "error",
      fix: "Run 'unforgit init' in the repository root.",
    });
  });

  it("reports local memory, embedding, tombstone, and sync diagnostics without requiring a remote", async () => {
    tmp = createTempDataDir({ remote: { url: "" } });
    process.chdir(tmp.dir);

    const store = new LocalStore(tmp.dbPath);
    try {
      store.store({
        orgId: "test-org",
        repoId: "test-repo",
        scopeType: "repo",
        memoryType: "semantic",
        visibility: "private",
        text: "Doctor test memory",
        tags: [],
      });
    } finally {
      store.close();
    }

    const result = await runCommand(["doctor", "--json"]);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.summary.errors).toBe(0);
    expect(payload.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ check: "memory-stats", status: "ok" }),
        expect.objectContaining({ check: "embeddings", status: "warn", fix: "Run 'unforgit embeddings backfill'." }),
        expect.objectContaining({ check: "tombstones", status: "ok" }),
        expect.objectContaining({
          check: "sync",
          status: "warn",
          fix: "Run 'unforgit push' to publish local memory changes, or configure/disable sync if this repository is intentionally local-only.",
        }),
        expect.objectContaining({ check: "remote", status: "warn", fix: "Run 'unforgit remote add origin <url>' if this repo should sync remotely." }),
      ]),
    );
    expect(result.stdout).not.toContain(process.env.OPENAI_API_KEY ?? "__missing_openai_key__");
  });
});
