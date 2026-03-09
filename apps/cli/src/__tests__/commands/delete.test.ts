import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempHippoDir } from "../helpers.js";
import { LocalStore } from "@unforgit/db";

describe("delete and restore", () => {
  let tmpDir: ReturnType<typeof createTempHippoDir>;
  let store: LocalStore;

  beforeEach(() => {
    tmpDir = createTempHippoDir();
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
});
