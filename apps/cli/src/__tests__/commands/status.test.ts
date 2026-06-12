import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStore } from "unforgit-db";
import { createTempDataDir, runCommand } from "../helpers.js";

describe("status command", () => {
  let tmp: ReturnType<typeof createTempDataDir>;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmp = createTempDataDir();
    process.chdir(tmp.dir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    tmp.cleanup();
  });

  it("explains pending sync actions in machine-readable status output", async () => {
    const store = new LocalStore(tmp.dbPath);
    try {
      const local = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "semantic",
        visibility: "repo",
        text: "Local memory waiting to push",
      });
      store.initSyncStateForMemory(local.id);

      const remote = store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "semantic",
        visibility: "repo",
        text: "Remote memory waiting to pull",
      });
      store.setSyncState({
        memoryId: remote.id,
        localVersion: remote.version,
        remoteVersion: remote.version + 1,
        syncStatus: "pending_pull",
        lastPulledAt: new Date("2026-01-02T03:04:05.000Z"),
      });
    } finally {
      store.close();
    }

    const result = await runCommand(["status", "--json"]);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({
      remote: "http://localhost:3737",
      remoteConfigured: true,
      synced: 0,
      pendingPush: 1,
      pendingPull: 1,
      conflicts: 0,
      untracked: 0,
      clean: false,
    });
    expect(payload.recommendations).toEqual([
      "Run 'unforgit push' to publish local memory changes.",
      "Run 'unforgit pull' to fetch remote memory changes.",
    ]);
    expect(payload.details.pendingPush[0]).toMatchObject({
      id: expect.any(String),
      preview: "Local memory waiting to push",
      status: "active",
      syncStatus: "pending_push",
    });
    expect(payload.details.pendingPull[0]).toMatchObject({
      id: expect.any(String),
      preview: "Remote memory waiting to pull",
      syncStatus: "pending_pull",
      remoteVersion: 2,
      lastPulledAt: "2026-01-02T03:04:05.000Z",
    });
  });

  it("marks local-only repositories as clean without sync recommendations when no changes are pending", async () => {
    tmp.cleanup();
    tmp = createTempDataDir({ remote: { url: "" } });
    process.chdir(tmp.dir);

    const result = await runCommand(["status", "--json"]);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({
      remote: null,
      remoteConfigured: false,
      clean: true,
      pendingPush: 0,
      pendingPull: 0,
      conflicts: 0,
      untracked: 0,
      recommendations: [],
    });
  });
});
