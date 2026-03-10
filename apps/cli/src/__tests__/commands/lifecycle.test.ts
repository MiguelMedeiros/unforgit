import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempDataDir } from "../helpers.js";
import { LocalStore } from "@unforgit/db";

describe("lifecycle commands", () => {
  let tmp: ReturnType<typeof createTempDataDir>;
  let store: LocalStore;

  beforeEach(() => {
    tmp = createTempDataDir();
    store = new LocalStore(tmp.dbPath);
  });

  afterEach(() => {
    store.close();
    tmp.cleanup();
  });

  describe("deprecate", () => {
    it("marks memory as deprecated", () => {
      const memory = store.store({
        orgId: "org",
        repoId: "repo",
        memoryType: "episodic",
        text: "Old info",
      });

      const ok = store.deprecate(memory.id, "outdated");
      expect(ok).toBe(true);

      const updated = store.getById(memory.id);
      expect(updated?.status).toBe("deprecated");
    });

    it("returns false for non-existent memory", () => {
      const ok = store.deprecate("nonexistent");
      expect(ok).toBe(false);
    });
  });

  describe("supersede", () => {
    it("marks old memory as superseded", () => {
      const old = store.store({
        orgId: "org",
        repoId: "repo",
        memoryType: "semantic",
        text: "Old approach",
      });

      const newer = store.store({
        orgId: "org",
        repoId: "repo",
        memoryType: "semantic",
        text: "New approach",
      });

      const ok = store.supersede(old.id, newer.id);
      expect(ok).toBe(true);

      const updated = store.getById(old.id);
      expect(updated?.status).toBe("superseded");
    });
  });

  describe("soft delete / restore", () => {
    it("soft deletes and restores a memory", () => {
      const memory = store.store({
        orgId: "org",
        repoId: "repo",
        memoryType: "episodic",
        text: "Will be deleted",
      });

      const deleted = store.softDelete({ id: memory.id });
      expect(deleted).toBe(true);

      const afterDelete = store.getById(memory.id);
      expect(afterDelete?.status).toBe("deleted");

      const restored = store.restore(memory.id);
      expect(restored).toBe(true);

      const afterRestore = store.getById(memory.id);
      expect(afterRestore?.status).toBe("active");
    });

    it("hard delete removes permanently", () => {
      const memory = store.store({
        orgId: "org",
        repoId: "repo",
        memoryType: "episodic",
        text: "Will be hard deleted",
      });

      const ok = store.hardDelete(memory.id);
      expect(ok).toBe(true);

      const afterDelete = store.getById(memory.id);
      expect(afterDelete).toBeUndefined();
    });

    it("restore returns false for non-existent", () => {
      const ok = store.restore("nonexistent");
      expect(ok).toBe(false);
    });

    it("expires stale episodic memories via soft delete and tombstones", () => {
      const expiredAt = new Date(Date.now() - 5_000);
      store.upsertFromRemote({
        id: "expired-memory-1",
        orgId: "org",
        repoId: "repo",
        scopeType: "repo",
        memoryType: "episodic",
        visibility: "private",
        status: "active",
        text: "Ephemeral note",
        tags: [],
        ttlSeconds: 1,
        version: 1,
        createdAt: expiredAt,
        updatedAt: new Date(),
      });

      const expired = store.expireExpiredMemories("org", "repo");
      expect(expired).toBe(1);

      const updated = store.getById("expired-memory-1");
      expect(updated?.status).toBe("deleted");

      const tombstones = store.getTombstones("org", "repo");
      expect(tombstones).toHaveLength(1);
      expect(tombstones[0].memoryId).toBe("expired-memory-1");
    });

    it("hides expired memories from recall and list unless requested", () => {
      const expiredAt = new Date(Date.now() - 5_000);
      store.upsertFromRemote({
        id: "expired-memory-2",
        orgId: "org",
        repoId: "repo",
        scopeType: "repo",
        memoryType: "episodic",
        visibility: "private",
        status: "active",
        text: "Short lived observation",
        tags: [],
        ttlSeconds: 1,
        version: 1,
        createdAt: expiredAt,
        updatedAt: new Date(),
      });

      const hiddenRecall = store.recall({
        orgId: "org",
        repoId: "repo",
        query: "observation",
      });
      expect(hiddenRecall).toHaveLength(0);

      const visibleRecall = store.recall({
        orgId: "org",
        repoId: "repo",
        query: "observation",
        includeExpired: true,
      });
      expect(visibleRecall).toHaveLength(1);

      const hiddenList = store.list({
        orgId: "org",
        repoId: "repo",
        status: ["active"],
      });
      expect(hiddenList).toHaveLength(0);

      const visibleList = store.list({
        orgId: "org",
        repoId: "repo",
        status: ["active"],
        includeExpired: true,
      });
      expect(visibleList).toHaveLength(1);
    });
  });

  describe("links", () => {
    it("creates and retrieves links", () => {
      const m1 = store.store({
        orgId: "org",
        repoId: "repo",
        memoryType: "semantic",
        text: "Memory 1",
      });

      const m2 = store.store({
        orgId: "org",
        repoId: "repo",
        memoryType: "semantic",
        text: "Memory 2",
      });

      const link = store.link({
        sourceId: m1.id,
        targetId: m2.id,
        linkType: "related_to",
      });

      expect(link.id).toBeDefined();
      expect(link.linkType).toBe("related_to");

      const links = store.getLinks({ memoryId: m1.id });
      expect(links.length).toBe(1);
      expect(links[0].targetId).toBe(m2.id);
    });

    it("unlinks memories", () => {
      const m1 = store.store({
        orgId: "org",
        repoId: "repo",
        memoryType: "semantic",
        text: "Source",
      });

      const m2 = store.store({
        orgId: "org",
        repoId: "repo",
        memoryType: "semantic",
        text: "Target",
      });

      store.link({ sourceId: m1.id, targetId: m2.id, linkType: "related_to" });
      const ok = store.unlink(m1.id, m2.id, "related_to");
      expect(ok).toBe(true);

      const links = store.getLinks({ memoryId: m1.id });
      expect(links.length).toBe(0);
    });
  });
});
