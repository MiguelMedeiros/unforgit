import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTempHippoDir, mockFetch, restoreFetch } from "../helpers.js";
import { LocalStore } from "@unforgit/db";

describe("push/pull logic", () => {
  let tmp: ReturnType<typeof createTempHippoDir>;
  let store: LocalStore;

  beforeEach(() => {
    tmp = createTempHippoDir();
    store = new LocalStore(tmp.dbPath);
  });

  afterEach(() => {
    store.close();
    tmp.cleanup();
    restoreFetch();
    vi.restoreAllMocks();
  });

  describe("push", () => {
    it("tracks pending push after storing a memory with sync state", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "test memory for push",
        visibility: "repo",
      });

      store.initSyncStateForMemory(memory.id);
      const pending = store.getPendingPush();
      expect(pending.length).toBe(1);
      expect(pending[0].memory.id).toBe(memory.id);
    });

    it("marks memory as pushed after successful sync", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "pushed memory",
        visibility: "repo",
      });

      store.initSyncStateForMemory(memory.id);
      store.markAsPushed(memory.id, 1);

      const pending = store.getPendingPush();
      expect(pending.length).toBe(0);

      const syncState = store.getSyncState(memory.id);
      expect(syncState?.syncStatus).toBe("synced");
      expect(syncState?.remoteVersion).toBe(1);
    });

    it("marks as conflict on version mismatch", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "conflict memory",
        visibility: "repo",
      });

      store.initSyncStateForMemory(memory.id);
      store.markAsConflict(memory.id, 2);

      const conflicts = store.getConflicts();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].memory.id).toBe(memory.id);
      expect(conflicts[0].syncState.syncStatus).toBe("conflict");
    });

    it("detects untracked memories (pre-sync era)", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "untracked memory",
        visibility: "repo",
      });

      // store() auto-creates sync state, so delete it to simulate a pre-sync memory
      const db = (store as unknown as { db: { prepare: (sql: string) => { run: (...args: unknown[]) => void } } }).db;
      db.prepare("DELETE FROM sync_state WHERE memory_id = ?").run(memory.id);

      const untracked = store.getUntrackedMemories("test-org", "test-repo");
      expect(untracked.length).toBe(1);
      expect(untracked[0].id).toBe(memory.id);
    });

    it("initializes sync state for untracked memories", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "to track",
        visibility: "repo",
      });

      // store() auto-creates sync state, delete to simulate pre-sync memory
      const db = (store as unknown as { db: { prepare: (sql: string) => { run: (...args: unknown[]) => void } } }).db;
      db.prepare("DELETE FROM sync_state WHERE memory_id = ?").run(memory.id);

      expect(store.getSyncState(memory.id)).toBeUndefined();

      store.initSyncStateForMemory(memory.id);
      const syncState = store.getSyncState(memory.id);
      expect(syncState).toBeDefined();
      expect(syncState!.syncStatus).toBe("pending_push");
    });
  });

  describe("pull", () => {
    it("upserts a new remote memory into local store", () => {
      const remoteMemory = {
        id: "remote-mem-001",
        orgId: "test-org",
        repoId: "test-repo",
        scopeType: "repo" as const,
        memoryType: "semantic" as const,
        visibility: "repo" as const,
        status: "active" as const,
        text: "Remote knowledge: use UTC timestamps everywhere",
        tags: ["convention"],
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = store.upsertFromRemote(remoteMemory);
      expect(result.action).toBe("created");

      const found = store.getById("remote-mem-001");
      expect(found).toBeDefined();
      expect(found!.text).toBe("Remote knowledge: use UTC timestamps everywhere");
      expect(found!.memoryType).toBe("semantic");
    });

    it("updates existing memory on pull", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "semantic",
        text: "Original text",
        visibility: "repo",
      });

      store.initSyncStateForMemory(memory.id);
      store.markAsPushed(memory.id, 1);

      const updated = {
        id: memory.id,
        orgId: "test-org",
        repoId: "test-repo",
        scopeType: "repo" as const,
        memoryType: "semantic" as const,
        visibility: "repo" as const,
        status: "active" as const,
        text: "Updated from remote",
        tags: [],
        version: 2,
        createdAt: memory.createdAt,
        updatedAt: new Date(),
      };

      const result = store.upsertFromRemote(updated);
      expect(result.action).toBe("updated");

      const found = store.getById(memory.id);
      expect(found!.text).toBe("Updated from remote");
    });

    it("marks as pulled after successful pull", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "pull test",
        visibility: "repo",
      });

      store.initSyncStateForMemory(memory.id);
      store.markAsPulled(memory.id, 2);

      const syncState = store.getSyncState(memory.id);
      expect(syncState?.syncStatus).toBe("synced");
      expect(syncState?.localVersion).toBe(2);
    });

    it("handles pull of deprecated memories", () => {
      const remoteMemory = {
        id: "deprecated-remote-001",
        orgId: "test-org",
        repoId: "test-repo",
        scopeType: "repo" as const,
        memoryType: "episodic" as const,
        visibility: "repo" as const,
        status: "deprecated" as const,
        text: "This is deprecated on remote",
        tags: [],
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.upsertFromRemote(remoteMemory);
      const found = store.getById("deprecated-remote-001");
      expect(found).toBeDefined();
      expect(found!.status).toBe("deprecated");
    });
  });

  describe("conflict resolution", () => {
    it("force push overwrites conflict state", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "conflict text",
        visibility: "repo",
      });

      store.initSyncStateForMemory(memory.id);
      store.markAsConflict(memory.id, 2);

      expect(store.getConflicts().length).toBe(1);

      store.markAsPushed(memory.id, 3);

      const syncState = store.getSyncState(memory.id);
      expect(syncState?.syncStatus).toBe("synced");
      expect(store.getConflicts().length).toBe(0);
    });

    it("force pull resolves conflict by accepting remote", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "local version",
        visibility: "repo",
      });

      store.initSyncStateForMemory(memory.id);
      store.markAsConflict(memory.id, 2);

      store.upsertFromRemote({
        id: memory.id,
        orgId: "test-org",
        repoId: "test-repo",
        scopeType: "repo",
        memoryType: "episodic",
        visibility: "repo",
        status: "active",
        text: "remote version wins",
        tags: [],
        version: 3,
        createdAt: memory.createdAt,
        updatedAt: new Date(),
      });

      store.markAsPulled(memory.id, 3);

      const found = store.getById(memory.id);
      expect(found!.text).toBe("remote version wins");
      expect(store.getConflicts().length).toBe(0);
    });
  });

  describe("RemoteClient integration", () => {
    it("store calls remote API and returns id", async () => {
      const { RemoteClient } = await import("@unforgit/config");
      mockFetch([{ status: 200, body: { id: "remote-123" } }]);

      const client = new RemoteClient("http://localhost:3737");
      const result = await client.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "push this memory",
      });

      expect(result.id).toBe("remote-123");
    });

    it("recall fetches remote memories", async () => {
      const { RemoteClient } = await import("@unforgit/config");
      mockFetch([{
        status: 200,
        body: {
          results: [
            {
              id: "r-1",
              memoryType: "semantic",
              text: "remote memory",
              tags: ["test"],
              score: 1.0,
              source: "remote",
            },
          ],
        },
      }]);

      const client = new RemoteClient("http://localhost:3737");
      const result = await client.recall({
        orgId: "test-org",
        repoId: "test-repo",
        query: "*",
        k: 100,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].text).toBe("remote memory");
    });

    it("handles remote API failure during push", async () => {
      const { RemoteClient } = await import("@unforgit/config");
      mockFetch([{ status: 400, body: "Bad request" }]);

      const client = new RemoteClient("http://localhost:3737");
      await expect(
        client.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "will fail",
        }),
      ).rejects.toThrow("Remote store failed (400)");
    });

    it("handles auth failure during push", async () => {
      const { RemoteClient } = await import("@unforgit/config");
      mockFetch([{ status: 401, body: "Unauthorized" }]);

      const client = new RemoteClient("http://localhost:3737");
      await expect(
        client.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "no auth",
        }),
      ).rejects.toThrow("Authentication failed");
    });
  });
});
