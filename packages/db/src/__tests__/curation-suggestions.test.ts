import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStore } from "../local.js";

let tmpDir: string;
let store: LocalStore;

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
});
