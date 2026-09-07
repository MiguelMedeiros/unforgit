import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createServer } from "node:http";
import { once } from "node:events";
import { createTempDataDir, mockFetch, restoreFetch, runCommand } from "../helpers.js";
import { LocalStore } from "unforgit-db";

async function startRecordingServer(options: { beforeResponse?: () => Promise<void> } = {}): Promise<{
  url: string;
  requests: Array<{ method?: string; url?: string; body: string }>;
  firstRequest: Promise<void>;
  close: () => Promise<void>;
}> {
  const requests: Array<{ method?: string; url?: string; body: string }> = [];
  let resolveFirstRequest: () => void;
  const firstRequest = new Promise<void>((resolve) => {
    resolveFirstRequest = resolve;
  });
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    requests.push({
      method: request.method,
      url: request.url,
      body: Buffer.concat(chunks).toString("utf8"),
    });
    resolveFirstRequest!();
    await options.beforeResponse?.();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind to TCP");

  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    firstRequest,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

describe("push/pull logic", () => {
  let tmp: ReturnType<typeof createTempDataDir>;
  let store: LocalStore;

  beforeEach(() => {
    tmp = createTempDataDir();
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

    it("tracks local deprecation until its status is synced", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "deprecated after initial sync",
        visibility: "repo",
      });

      store.markAsPushed(memory.id, memory.version);
      expect(store.getDeprecatedMemoriesToSync("test-org", "test-repo")).toEqual([]);

      store.deprecate(memory.id, "outdated");

      const deprecated = store.getDeprecatedMemoriesToSync("test-org", "test-repo");
      expect(deprecated).toHaveLength(1);
      expect(deprecated[0].id).toBe(memory.id);
      expect(deprecated[0].status).toBe("deprecated");
      expect(deprecated[0].version).toBe(memory.version + 1);
      expect(deprecated[0].sourceRefs).toMatchObject({ deprecation_reason: "outdated" });
      expect(store.getSyncState(memory.id)?.syncStatus).toBe("pending_push");

      store.markStatusSynced(memory.id, deprecated[0].version);

      expect(store.getDeprecatedMemoriesToSync("test-org", "test-repo")).toEqual([]);
      expect(store.getSyncState(memory.id)?.localVersion).toBe(memory.version + 1);
    });

    it("keeps never-synced deprecation local", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "private memory deprecated before first push",
        visibility: "private",
      });

      store.deprecate(memory.id, "local-only reason");

      expect(store.getDeprecatedMemoriesToSync("test-org", "test-repo")).toEqual([]);
      expect(store.getSyncState(memory.id)).toMatchObject({
        localVersion: memory.version + 1,
        syncStatus: "synced",
      });
    });

    it("does not queue a deprecated memory just pulled from remote", () => {
      const memory = {
        id: "remote-deprecated",
        orgId: "test-org",
        repoId: "test-repo",
        scopeType: "repo" as const,
        memoryType: "episodic" as const,
        visibility: "repo" as const,
        status: "deprecated" as const,
        text: "already deprecated remotely",
        tags: [],
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.upsertFromRemote(memory);
      store.setSyncState({
        memoryId: memory.id,
        localVersion: memory.version,
        remoteVersion: memory.version,
        lastPulledAt: new Date(),
        syncStatus: "synced",
      });

      expect(store.getDeprecatedMemoriesToSync("test-org", "test-repo")).toEqual([]);
    });

    it("pushes local deprecation to the remote API", async () => {
      const remote = await startRecordingServer();

      try {
        store.close();
        tmp.cleanup();
        tmp = createTempDataDir({
          remote: {
            url: remote.url,
            orgId: "test-org",
            repoId: "test-repo",
          },
        });
        store = new LocalStore(tmp.dbPath);
        const memory = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "sync this deprecation",
          visibility: "repo",
        });
        store.markAsPushed(memory.id, memory.version);
        store.deprecate(memory.id, "replaced by current guidance");
        store.close();

        const result = await runCommand(["push"], { cwd: tmp.dir });
        store = new LocalStore(tmp.dbPath);

        expect(result.exitCode).toBe(0);
        expect(remote.requests).toEqual([
          {
            method: "POST",
            url: `/v1/memory/${memory.id}/deprecate`,
            body: JSON.stringify({ reason: "replaced by current guidance" }),
          },
        ]);
        expect(store.getDeprecatedMemoriesToSync("test-org", "test-repo")).toEqual([]);
      } finally {
        await remote.close();
      }
    });

    it("keeps a newer local deprecation pending while an older version is in flight", async () => {
      let releaseResponse: () => void;
      const responseGate = new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });
      const remote = await startRecordingServer({ beforeResponse: () => responseGate });

      try {
        store.close();
        tmp.cleanup();
        tmp = createTempDataDir({
          remote: {
            url: remote.url,
            orgId: "test-org",
            repoId: "test-repo",
          },
        });
        store = new LocalStore(tmp.dbPath);
        const memory = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "concurrent deprecation",
          visibility: "repo",
        });
        store.markAsPushed(memory.id, memory.version);
        store.deprecate(memory.id, "reason A");
        store.close();

        const pushResult = runCommand(["push"], { cwd: tmp.dir });
        await remote.firstRequest;
        const concurrentStore = new LocalStore(tmp.dbPath);
        concurrentStore.deprecate(memory.id, "reason B");
        concurrentStore.close();
        releaseResponse!();

        expect((await pushResult).exitCode).toBe(0);
        store = new LocalStore(tmp.dbPath);
        const pending = store.getDeprecatedMemoriesToSync("test-org", "test-repo");
        expect(pending).toHaveLength(1);
        expect(pending[0]).toMatchObject({
          id: memory.id,
          version: memory.version + 2,
          sourceRefs: { deprecation_reason: "reason B" },
        });
        expect(store.getSyncState(memory.id)?.syncStatus).toBe("pending_push");
        expect(remote.requests).toHaveLength(1);
        expect(remote.requests[0].body).toBe(JSON.stringify({ reason: "reason A" }));
      } finally {
        releaseResponse!();
        await remote.close();
      }
    });

    it("keeps a local deprecation pending when an ordinary memory push is in flight", async () => {
      let releaseResponse: () => void;
      const responseGate = new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });
      const remote = await startRecordingServer({ beforeResponse: () => responseGate });

      try {
        store.close();
        tmp.cleanup();
        tmp = createTempDataDir({
          remote: {
            url: remote.url,
            orgId: "test-org",
            repoId: "test-repo",
          },
        });
        store = new LocalStore(tmp.dbPath);
        const memory = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "deprecate during initial push",
          visibility: "repo",
        });
        store.close();

        const pushResult = runCommand(["push"], { cwd: tmp.dir });
        await remote.firstRequest;
        const concurrentStore = new LocalStore(tmp.dbPath);
        concurrentStore.deprecate(memory.id, "cancelled while create was in flight");
        concurrentStore.close();
        releaseResponse!();

        expect((await pushResult).exitCode).toBe(0);
        store = new LocalStore(tmp.dbPath);
        expect(store.getDeprecatedMemoriesToSync("test-org", "test-repo")).toEqual([
          expect.objectContaining({
            id: memory.id,
            version: memory.version + 1,
            status: "deprecated",
          }),
        ]);
        expect(store.getSyncState(memory.id)?.syncStatus).toBe("pending_push");
        expect(remote.requests).toHaveLength(1);
        expect(remote.requests[0]).toMatchObject({
          method: "POST",
          url: "/v1/memory",
        });
      } finally {
        releaseResponse!();
        await remote.close();
      }
    });

    it("does not create a stale remote memory after lifecycle queues are captured", async () => {
      let releaseResponse: () => void;
      const responseGate = new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });
      const remote = await startRecordingServer({ beforeResponse: () => responseGate });

      try {
        store.close();
        tmp.cleanup();
        tmp = createTempDataDir({
          remote: {
            url: remote.url,
            orgId: "test-org",
            repoId: "test-repo",
          },
        });
        store = new LocalStore(tmp.dbPath);
        const first = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "first queued memory",
          visibility: "repo",
        });
        const second = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "second queued memory",
          visibility: "repo",
        });
        const db = (store as unknown as { db: { prepare: (sql: string) => { run: (...args: unknown[]) => void } } }).db;
        db.prepare("UPDATE memories SET updated_at = ? WHERE id = ?").run("2000-01-01T00:00:00.000Z", first.id);
        db.prepare("UPDATE memories SET updated_at = ? WHERE id = ?").run("2001-01-01T00:00:00.000Z", second.id);
        store.close();

        const pushResult = runCommand(["push"], { cwd: tmp.dir });
        await remote.firstRequest;
        const concurrentStore = new LocalStore(tmp.dbPath);
        concurrentStore.deprecate(second.id, "changed after queue capture");
        concurrentStore.close();
        releaseResponse!();

        expect((await pushResult).exitCode).toBe(0);
        store = new LocalStore(tmp.dbPath);
        expect(remote.requests).toHaveLength(1);
        expect(JSON.parse(remote.requests[0].body)).toMatchObject({ id: first.id });
        expect(store.getById(second.id)).toMatchObject({
          id: second.id,
          status: "deprecated",
          version: second.version + 1,
        });
        expect(store.getSyncState(second.id)).toMatchObject({
          syncStatus: "synced",
          lastPushedAt: undefined,
        });
        expect(store.getSyncState(second.id)?.remoteVersion).toBeNull();
      } finally {
        releaseResponse!();
        await remote.close();
      }
    });

    it("keeps a newer supersede target pending while an older target is in flight", async () => {
      let releaseResponse: () => void;
      const responseGate = new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });
      const remote = await startRecordingServer({ beforeResponse: () => responseGate });

      try {
        store.close();
        tmp.cleanup();
        tmp = createTempDataDir({
          remote: {
            url: remote.url,
            orgId: "test-org",
            repoId: "test-repo",
          },
        });
        store = new LocalStore(tmp.dbPath);
        const memory = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "supersede concurrently",
          visibility: "repo",
        });
        const replacementA = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "replacement A",
          visibility: "repo",
        });
        const replacementB = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "replacement B",
          visibility: "repo",
        });
        for (const item of [memory, replacementA, replacementB]) {
          store.markAsPushed(item.id, item.version);
        }
        store.setSyncState({
          memoryId: memory.id,
          localVersion: memory.version,
          remoteVersion: memory.version,
          lastPushedAt: new Date("2000-01-01T00:00:00.000Z"),
          syncStatus: "synced",
        });
        store.supersede(memory.id, replacementA.id);
        store.close();

        const pushResult = runCommand(["push"], { cwd: tmp.dir });
        await remote.firstRequest;
        const concurrentStore = new LocalStore(tmp.dbPath);
        concurrentStore.supersede(memory.id, replacementB.id);
        concurrentStore.close();
        releaseResponse!();

        expect((await pushResult).exitCode).toBe(0);
        store = new LocalStore(tmp.dbPath);
        expect(store.getSupersededMemoriesToSync("test-org", "test-repo")).toEqual([
          expect.objectContaining({
            memory: expect.objectContaining({
              id: memory.id,
              version: memory.version + 2,
            }),
            newId: replacementB.id,
          }),
        ]);
        expect(store.getSyncState(memory.id)?.syncStatus).toBe("pending_push");
        expect(remote.requests).toEqual([
          {
            method: "POST",
            url: `/v1/memory/${memory.id}/supersede`,
            body: JSON.stringify({ newId: replacementA.id }),
          },
        ]);
      } finally {
        releaseResponse!();
        await remote.close();
      }
    });

    it("does not acknowledge a status push after sync state becomes conflicted", () => {
      const memory = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "episodic",
        text: "conflicted status update",
        visibility: "repo",
      });
      store.markAsPushed(memory.id, memory.version);
      store.deprecate(memory.id, "outdated");
      const deprecated = store.getById(memory.id)!;
      store.markAsConflict(memory.id, memory.version + 1);

      expect(store.markStatusSynced(memory.id, deprecated.version)).toBe(false);
      expect(store.getSyncState(memory.id)).toMatchObject({
        syncStatus: "conflict",
        remoteVersion: memory.version + 1,
      });
    });

    it("does not push a private deprecation without force", async () => {
      const remote = await startRecordingServer();

      try {
        store.close();
        tmp.cleanup();
        tmp = createTempDataDir({
          remote: {
            url: remote.url,
            orgId: "test-org",
            repoId: "test-repo",
          },
        });
        store = new LocalStore(tmp.dbPath);
        const memory = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "previously force-pushed private memory",
          visibility: "private",
        });
        store.markAsPushed(memory.id, memory.version);
        store.deprecate(memory.id, "sensitive local reason");
        store.close();

        const result = await runCommand(["push"], { cwd: tmp.dir });
        store = new LocalStore(tmp.dbPath);

        expect(result.exitCode).toBe(0);
        expect(remote.requests).toEqual([]);
        expect(store.getDeprecatedMemoriesToSync("test-org", "test-repo")).toHaveLength(1);
      } finally {
        await remote.close();
      }
    });

    it("does not push a private supersede status without force", async () => {
      const remote = await startRecordingServer();

      try {
        store.close();
        tmp.cleanup();
        tmp = createTempDataDir({
          remote: {
            url: remote.url,
            orgId: "test-org",
            repoId: "test-repo",
          },
        });
        store = new LocalStore(tmp.dbPath);
        const memory = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "previously force-pushed private memory",
          visibility: "private",
        });
        const replacement = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "private replacement",
          visibility: "private",
        });
        store.markAsPushed(memory.id, memory.version);
        store.markAsPushed(replacement.id, replacement.version);
        store.supersede(memory.id, replacement.id);
        store.close();

        const result = await runCommand(["push"], { cwd: tmp.dir });
        store = new LocalStore(tmp.dbPath);

        expect(result.exitCode).toBe(0);
        expect(remote.requests).toEqual([]);
        expect(store.getSupersededMemoriesToSync("test-org", "test-repo")).toHaveLength(1);
      } finally {
        await remote.close();
      }
    });

    it("does not initialize sync state for a legacy local deprecated memory", async () => {
      const remote = await startRecordingServer();

      try {
        store.close();
        tmp.cleanup();
        tmp = createTempDataDir({
          remote: {
            url: remote.url,
            orgId: "test-org",
            repoId: "test-repo",
          },
        });
        store = new LocalStore(tmp.dbPath);
        const memory = store.store({
          orgId: "test-org",
          repoId: "test-repo",
          memoryType: "episodic",
          text: "legacy local deprecated memory",
          visibility: "repo",
        });
        store.deprecate(memory.id, "never existed remotely");
        const db = (store as unknown as { db: { prepare: (sql: string) => { run: (...args: unknown[]) => void } } }).db;
        db.prepare("DELETE FROM sync_state WHERE memory_id = ?").run(memory.id);
        store.close();

        const result = await runCommand(["push", "--all"], { cwd: tmp.dir });
        store = new LocalStore(tmp.dbPath);

        expect(result.exitCode).toBe(0);
        expect(remote.requests).toEqual([]);
        expect(store.getSyncState(memory.id)).toBeUndefined();
      } finally {
        await remote.close();
      }
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
      const { RemoteClient } = await import("unforgit-config");
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
      const { RemoteClient } = await import("unforgit-config");
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
      const { RemoteClient } = await import("unforgit-config");
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
      const { RemoteClient } = await import("unforgit-config");
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
