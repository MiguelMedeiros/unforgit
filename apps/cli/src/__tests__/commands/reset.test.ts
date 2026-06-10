import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempDataDir } from "../helpers.js";
import { LocalStore } from "unforgit-db";
import { createLocalResetBackup } from "../../commands/reset.js";

describe("reset", () => {
  let tmpDir: ReturnType<typeof createTempDataDir>;
  let store: LocalStore;

  beforeEach(() => {
    tmpDir = createTempDataDir();
    store = new LocalStore(tmpDir.dbPath);
  });

  afterEach(() => {
    store.close();
    tmpDir.cleanup();
  });

  it("resetAll deletes all memories", () => {
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "memory 1",
      tags: [],
      visibility: "auto",
    });
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "memory 2",
      tags: [],
      visibility: "auto",
    });

    const before = store.list({ orgId: "test-org", repoId: "test-repo" });
    expect(before.length).toBe(2);

    const result = store.resetAll();
    expect(result.memoriesDeleted).toBe(2);

    const after = store.list({ orgId: "test-org", repoId: "test-repo" });
    expect(after.length).toBe(0);
  });

  it("resetAll deletes links too", () => {
    const m1 = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "memory 1",
      tags: [],
      visibility: "auto",
    });
    const m2 = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "memory 2",
      tags: [],
      visibility: "auto",
    });

    store.link({ sourceId: m1.id, targetId: m2.id, linkType: "related_to" });

    const result = store.resetAll();
    expect(result.memoriesDeleted).toBe(2);
    expect(result.linksDeleted).toBe(1);
  });

  it("resetAll handles empty database", () => {
    const result = store.resetAll();
    expect(result.memoriesDeleted).toBe(0);
    expect(result.linksDeleted).toBe(0);
    expect(result.embeddingsDeleted).toBe(0);
  });

  it("creates a timestamped local database backup before destructive reset", () => {
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "recoverable memory",
      tags: [],
      visibility: "auto",
    });
    store.close();

    const backup = createLocalResetBackup(
      tmpDir.dbPath,
      new Date("2026-06-10T12:34:56Z"),
    );

    expect(backup).not.toBeNull();
    expect(backup?.dir).toBe(
      path.join(tmpDir.dataDir, "backups", "reset-20260610-123456"),
    );
    expect(backup?.files).toContain("local.db");
    expect(fs.existsSync(path.join(backup!.dir, "local.db"))).toBe(true);

    const backupStore = new LocalStore(path.join(backup!.dir, "local.db"));
    try {
      const memories = backupStore.list({ orgId: "test-org", repoId: "test-repo" });
      expect(
        memories.some((memory: { text: string }) => memory.text === "recoverable memory"),
      ).toBe(true);
    } finally {
      backupStore.close();
    }

    store = new LocalStore(tmpDir.dbPath);
  });
});
