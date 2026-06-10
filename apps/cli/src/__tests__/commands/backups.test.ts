import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempDataDir } from "../helpers.js";
import { LocalStore } from "unforgit-db";
import {
  createLocalResetBackup,
  listLocalResetBackups,
  restoreLocalResetBackup,
} from "../../commands/backups.js";

describe("local reset backups", () => {
  let tmpDir: ReturnType<typeof createTempDataDir>;
  let store: LocalStore;

  beforeEach(() => {
    tmpDir = createTempDataDir();
    process.env.UNFORGIT_DATA_DIR = tmpDir.dataDir;
    store = new LocalStore(tmpDir.dbPath);
  });

  afterEach(() => {
    store.close();
    tmpDir.cleanup();
    delete process.env.UNFORGIT_DATA_DIR;
  });

  it("lists reset backups with recoverable local databases", () => {
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "backup list memory",
      tags: [],
      visibility: "auto",
    });
    store.close();

    const backup = createLocalResetBackup(
      tmpDir.dbPath,
      new Date("2026-06-10T12:34:56Z"),
    );

    const backups = listLocalResetBackups(tmpDir.dbPath);

    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatchObject({
      name: "reset-20260610-123456",
      dir: backup?.dir,
      files: expect.arrayContaining(["local.db"]),
    });
    expect(backups[0].sizeBytes).toBeGreaterThan(0);

    store = new LocalStore(tmpDir.dbPath);
  });

  it("restores a selected reset backup and protects against path traversal", () => {
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "before reset",
      tags: [],
      visibility: "auto",
    });
    store.close();
    createLocalResetBackup(tmpDir.dbPath, new Date("2026-06-10T12:34:56Z"));

    store = new LocalStore(tmpDir.dbPath);
    store.resetAll();
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "after reset",
      tags: [],
      visibility: "auto",
    });
    store.close();

    expect(() => restoreLocalResetBackup(tmpDir.dbPath, "../reset-20260610-123456")).toThrow(
      "Invalid backup name",
    );

    const restored = restoreLocalResetBackup(
      tmpDir.dbPath,
      "reset-20260610-123456",
      new Date("2026-06-10T13:00:00Z"),
    );

    expect(restored.restoredFrom.name).toBe("reset-20260610-123456");
    expect(restored.safetyBackup?.name).toBe("reset-20260610-130000");
    expect(fs.existsSync(path.join(restored.safetyBackup!.dir, "local.db"))).toBe(true);

    const restoredStore = new LocalStore(tmpDir.dbPath);
    try {
      const memories = restoredStore.list({ orgId: "test-org", repoId: "test-repo" });
      expect(memories.some((memory: { text: string }) => memory.text === "before reset")).toBe(true);
      expect(memories.some((memory: { text: string }) => memory.text === "after reset")).toBe(false);
    } finally {
      restoredStore.close();
    }

    store = new LocalStore(tmpDir.dbPath);
  });
});
