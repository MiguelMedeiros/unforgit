import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTempDataDir, runCommand } from "../helpers.js";
import { LocalStore } from "unforgit-db";

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

describe("suggestions command", () => {
  it("lists and reviews pending curation suggestions", async () => {
    const store = new LocalStore(tmp.dbPath);
    let suggestionId: string;
    try {
      const suggestion = store.createCurationSuggestion({
        orgId: "test-org",
        repoId: "test-repo",
        type: "add_links",
        priority: "medium",
        memoryIds: ["mem-a", "mem-b"],
        reason: "Both memories describe release automation",
        confidence: 0.81,
        createdBy: "test-suite",
      });
      suggestionId = suggestion.id;
    } finally {
      store.close();
    }

    const list = await runCommand(["suggestions", "list"]);

    expect(list.exitCode).toBe(0);
    expect(list.stdout).toContain("Pending curation suggestions");
    expect(list.stdout).toContain(suggestionId!.slice(0, 8));
    expect(list.stdout).toContain("Both memories describe release automation");

    const review = await runCommand([
      "suggestions",
      "review",
      suggestionId!,
      "--approve",
      "--reviewer",
      "miguel",
      "--note",
      "Safe to apply",
    ]);

    expect(review.exitCode).toBe(0);
    expect(review.stdout).toContain("approved");

    const reviewedStore = new LocalStore(tmp.dbPath);
    try {
      const approved = reviewedStore.listCurationSuggestions({
        orgId: "test-org",
        repoId: "test-repo",
        status: ["approved"],
      });
      expect(approved).toHaveLength(1);
      expect(approved[0].reviewedBy).toBe("miguel");
      expect(approved[0].reviewNote).toBe("Safe to apply");
    } finally {
      reviewedStore.close();
    }
  });
});
