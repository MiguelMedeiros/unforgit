import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ConflictResolution, Memory } from "../../lib/types";
import { WebLocalStore } from "../../lib/local-store";

function memory(text: string, version: number, updatedAt: Date): Memory {
  return {
    id: "6d7484e7-39df-49e0-bc92-e713ba202843",
    orgId: "test-org",
    repoId: "test-repo",
    scopeType: "repo",
    memoryType: "semantic",
    visibility: "repo",
    status: "active",
    text,
    tags: ["sync"],
    version,
    createdAt: new Date("2026-09-14T11:00:00.000Z"),
    updatedAt,
  };
}

describe("WebLocalStore remote conflict resolution", () => {
  let tmpDir: string;
  let store: WebLocalStore;
  let local: Memory;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-sync-"));
    store = new WebLocalStore(path.join(tmpDir, "local.db"));
    store.upsertFromRemote(memory("local value", 3, new Date()));
    local = store.getById("6d7484e7-39df-49e0-bc92-e713ba202843")!;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it.each<ConflictResolution>(["manual", "local_wins", "last_write_wins"])(
    "preserves the newer local value for %s conflicts",
    (resolution) => {
      const result = store.upsertFromRemote(
        memory("stale remote value", 4, new Date(local.updatedAt.getTime() - 30_000)),
        resolution,
      );

      expect(result).toEqual({ action: "skipped", conflict: true });
      expect(store.getById("6d7484e7-39df-49e0-bc92-e713ba202843")).toMatchObject({
        text: "local value",
        version: 3,
        updatedAt: local.updatedAt,
      });
    },
  );

  it("allows remote_wins to replace a newer local value", () => {
    const result = store.upsertFromRemote(
      memory("forced remote value", 4, new Date(local.updatedAt.getTime() - 30_000)),
      "remote_wins",
    );

    expect(result).toEqual({ action: "updated", conflict: true });
    expect(store.getById("6d7484e7-39df-49e0-bc92-e713ba202843")?.text).toBe(
      "forced remote value",
    );
  });

  it("allows last_write_wins to apply a newer remote value", () => {
    const result = store.upsertFromRemote(
      memory("newer remote value", 4, new Date(local.updatedAt.getTime() + 30_000)),
      "last_write_wins",
    );

    expect(result.action).toBe("updated");
    expect(store.getById("6d7484e7-39df-49e0-bc92-e713ba202843")?.text).toBe(
      "newer remote value",
    );
  });
});
