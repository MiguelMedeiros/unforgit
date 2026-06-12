import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createTempDataDir, runCommand } from "../helpers.js";
import { LocalStore } from "unforgit-db";

describe("delete and restore", () => {
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

  it("soft deletes a memory", () => {
    const m = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "to delete",
      tags: [],
      visibility: "auto",
    });

    const ok = store.softDelete({ id: m.id });
    expect(ok).toBe(true);

    const deleted = store.getById(m.id);
    expect(deleted?.status).toBe("deleted");
  });

  it("restores a soft-deleted memory", () => {
    const m = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "to restore",
      tags: [],
      visibility: "auto",
    });

    store.softDelete({ id: m.id });
    const ok = store.restore(m.id);
    expect(ok).toBe(true);

    const restored = store.getById(m.id);
    expect(restored?.status).toBe("active");
  });

  it("hard deletes a memory permanently", () => {
    const m = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "permanent delete",
      tags: [],
      visibility: "auto",
    });

    const ok = store.hardDelete(m.id);
    expect(ok).toBe(true);

    const gone = store.getById(m.id);
    expect(gone).toBeFalsy();
  });

  it("returns false for non-existent memory", () => {
    const ok = store.softDelete({ id: "non-existent-id" });
    expect(ok).toBe(false);
  });

  it("returns false restoring a non-deleted memory", () => {
    const m = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "episodic",
      text: "active memory",
      tags: [],
      visibility: "auto",
    });

    const ok = store.restore(m.id);
    expect(ok).toBe(false);
  });

  it("creates a recoverable backup before hard deleting a local memory", async () => {
    const m = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "hard delete should still be recoverable from backup",
      tags: [],
      visibility: "auto",
    });
    store.close();

    const result = await runCommand(["delete", m.id, "--hard", "--force"], { cwd: tmpDir.dir });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("Created local hard-delete backup:");

    const backupRoot = path.join(tmpDir.dataDir, "backups");
    const backups = fs.readdirSync(backupRoot).filter((entry) => entry.startsWith("hard-delete-"));
    expect(backups).toHaveLength(1);

    const backupStore = new LocalStore(path.join(backupRoot, backups[0], "local.db"));
    try {
      expect(backupStore.getById(m.id)?.text).toBe("hard delete should still be recoverable from backup");
    } finally {
      backupStore.close();
    }

    store = new LocalStore(tmpDir.dbPath);
    expect(store.getById(m.id)).toBeFalsy();
  });

  it("allows explicitly skipping the hard-delete backup", async () => {
    const m = store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      text: "hard delete without backup",
      tags: [],
      visibility: "auto",
    });
    store.close();

    const result = await runCommand(["delete", m.id, "--hard", "--force", "--no-backup"], { cwd: tmpDir.dir });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(path.join(tmpDir.dataDir, "backups"))).toBe(false);

    store = new LocalStore(tmpDir.dbPath);
    expect(store.getById(m.id)).toBeFalsy();
  });
});
