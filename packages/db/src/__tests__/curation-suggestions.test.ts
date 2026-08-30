import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStore } from "../local.js";

let tmpDir: string;
let store: LocalStore;

function seedMemory(
  id: string,
  options: { repoId?: string; status?: "active" | "deprecated" } = {},
): void {
  const now = new Date();
  store.upsertFromRemote({
    id,
    orgId: "test-org",
    repoId: options.repoId ?? "test-repo",
    scopeType: "repo",
    memoryType: "semantic",
    visibility: "private",
    status: options.status ?? "active",
    text: `Memory ${id}`,
    tags: ["test"],
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-suggestions-"));
  store = new LocalStore(path.join(tmpDir, "local.db"));
});

afterEach(() => {
  store.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("curation suggestions", () => {
  it("persists reviewable suggestions and records review decisions", () => {
    seedMemory("mem-a");
    seedMemory("mem-b");
    const suggestion = store.createCurationSuggestion({
      orgId: "test-org",
      repoId: "test-repo",
      type: "add_links",
      priority: "medium",
      memoryIds: ["mem-a", "mem-b"],
      reason: "Both memories describe the same deployment workflow",
      confidence: 0.82,
      payload: {
        linkType: "related_to",
        sourceId: "mem-a",
        targetId: "mem-b",
      },
      createdBy: "test-suite",
    });

    expect(suggestion.status).toBe("pending");
    expect(suggestion.reviewedAt).toBeUndefined();
    expect(suggestion.payload).toEqual({
      linkType: "related_to",
      sourceId: "mem-a",
      targetId: "mem-b",
    });

    const pending = store.listCurationSuggestions({
      orgId: "test-org",
      repoId: "test-repo",
      status: ["pending"],
    });
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(suggestion.id);

    const approved = store.reviewCurationSuggestion({
      id: suggestion.id,
      status: "approved",
      reviewedBy: "miguel",
      reviewNote: "Looks safe to apply",
    });

    expect(approved.status).toBe("approved");
    expect(approved.reviewedBy).toBe("miguel");
    expect(approved.reviewNote).toBe("Looks safe to apply");
    expect(approved.reviewedAt).toBeInstanceOf(Date);

    expect(
      store.listCurationSuggestions({
        orgId: "test-org",
        repoId: "test-repo",
        status: ["pending"],
      }),
    ).toHaveLength(0);

    expect(
      store.listCurationSuggestions({
        orgId: "test-org",
        repoId: "test-repo",
        status: ["approved"],
      }),
    ).toHaveLength(1);
  });

  it("allows only pending review decisions followed by approved to applied", () => {
    seedMemory("mem-a");
    const suggestion = store.createCurationSuggestion({
      orgId: "test-org",
      repoId: "test-repo",
      type: "deprecate",
      priority: "medium",
      memoryIds: ["mem-a"],
      reason: "Memory is no longer current",
      confidence: 0.9,
    });

    expect(() =>
      store.reviewCurationSuggestion({ id: suggestion.id, status: "applied" }),
    ).toThrow("Cannot transition curation suggestion from pending to applied");
    expect(
      store.listCurationSuggestions({
        orgId: "test-org",
        repoId: "test-repo",
        status: ["pending"],
      }),
    ).toHaveLength(1);

    store.reviewCurationSuggestion({
      id: suggestion.id,
      status: "approved",
      reviewedBy: "miguel",
      reviewNote: "Proceed after backup",
    });
    const applied = store.reviewCurationSuggestion({
      id: suggestion.id,
      status: "applied",
      reviewedBy: "hermes",
      reviewNote: "Operation completed",
    });

    expect(applied.status).toBe("applied");
    expect(applied.appliedAt).toBeInstanceOf(Date);
    expect(() =>
      store.reviewCurationSuggestion({ id: suggestion.id, status: "rejected" }),
    ).toThrow("Cannot transition curation suggestion from applied to rejected");
  });

  it("fails safely when an approval references stale or foreign memories", () => {
    seedMemory("foreign-memory", { repoId: "other-repo" });
    seedMemory("deprecated-memory", { status: "deprecated" });

    for (const memoryId of ["missing-memory", "foreign-memory", "deprecated-memory"]) {
      const suggestion = store.createCurationSuggestion({
        orgId: "test-org",
        repoId: "test-repo",
        type: "add_tags",
        priority: "low",
        memoryIds: [memoryId],
        reason: "Memory needs review",
        confidence: 0.7,
      });

      expect(() =>
        store.reviewCurationSuggestion({ id: suggestion.id, status: "approved" }),
      ).toThrow(`Curation suggestion is stale: ${memoryId}`);

      const rejected = store.reviewCurationSuggestion({
        id: suggestion.id,
        status: "rejected",
        reviewedBy: "miguel",
        reviewNote: "Stale suggestion",
      });
      expect(rejected.status).toBe("rejected");
    }
  });

  it("does not mutate the inbox when the suggestion id is invalid", () => {
    expect(() =>
      store.reviewCurationSuggestion({ id: "missing", status: "approved" }),
    ).toThrow("Curation suggestion not found: missing");
    expect(
      store.listCurationSuggestions({ orgId: "test-org", repoId: "test-repo" }),
    ).toEqual([]);
  });

  it("does not overwrite a decision when the status changes after a stale read", () => {
    const pending = store.createCurationSuggestion({
      orgId: "test-org",
      repoId: "test-repo",
      type: "review",
      priority: "medium",
      memoryIds: [],
      reason: "Manual review required",
      confidence: 0.5,
    });
    store.reviewCurationSuggestion({
      id: pending.id,
      status: "rejected",
      reviewedBy: "first-reviewer",
    });

    const mutableStore = store as unknown as {
      getCurationSuggestionById: (id: string) => typeof pending | undefined;
    };
    const readCurrent = mutableStore.getCurationSuggestionById.bind(store);
    let injectStaleRead = true;
    mutableStore.getCurationSuggestionById = (id) => {
      if (injectStaleRead) {
        injectStaleRead = false;
        return pending;
      }
      return readCurrent(id);
    };

    expect(() =>
      store.reviewCurationSuggestion({
        id: pending.id,
        status: "approved",
        reviewedBy: "stale-reviewer",
      }),
    ).toThrow("Curation suggestion changed while reviewing");
    expect(
      store.listCurationSuggestions({
        orgId: "test-org",
        repoId: "test-repo",
        status: ["rejected"],
      }),
    ).toHaveLength(1);
  });
});
