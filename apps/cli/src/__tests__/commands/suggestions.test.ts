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
      const now = new Date();
      for (const id of ["mem-a", "mem-b"]) {
        store.upsertFromRemote({
          id,
          orgId: "test-org",
          repoId: "test-repo",
          scopeType: "repo",
          memoryType: "semantic",
          visibility: "private",
          status: "active",
          text: `Memory ${id}`,
          tags: ["test"],
          version: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
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

  it("runs the persisted generate, duplicate, approve, and apply workflow with visible provenance", async () => {
    const store = new LocalStore(tmp.dbPath);
    try {
      const now = new Date();
      store.upsertFromRemote({
        id: "acceptance-memory",
        orgId: "test-org",
        repoId: "test-repo",
        scopeType: "repo",
        memoryType: "semantic",
        visibility: "private",
        status: "active",
        text: "Acceptance workflow memory",
        tags: [],
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    } finally {
      store.close();
    }

    const generated = await runCommand([
      "suggestions",
      "generate",
      "--created-by",
      "acceptance-agent",
    ]);
    expect(generated.exitCode).toBe(0);
    expect(generated.stdout).toMatch(/created [1-9]\d* pending review items/);

    const duplicate = await runCommand([
      "suggestions",
      "generate",
      "--created-by",
      "acceptance-agent",
    ]);
    expect(duplicate.exitCode).toBe(0);
    expect(duplicate.stdout).toMatch(/created 0 pending review items; skipped [1-9]\d* existing/);

    const pendingStore = new LocalStore(tmp.dbPath);
    let suggestionId: string;
    try {
      const pending = pendingStore.listCurationSuggestions({
        orgId: "test-org",
        repoId: "test-repo",
        status: ["pending"],
      });
      expect(pending.length).toBeGreaterThan(0);
      suggestionId = pending[0].id;
    } finally {
      pendingStore.close();
    }

    const pendingList = await runCommand(["suggestions", "list"]);
    expect(pendingList.stdout).toContain("created by: acceptance-agent");

    const approved = await runCommand([
      "suggestions",
      "review",
      suggestionId!,
      "--approve",
      "--reviewer",
      "miguel",
      "--note",
      "Safe after backup",
    ]);
    expect(approved.exitCode).toBe(0);

    const approvedList = await runCommand([
      "suggestions",
      "list",
      "--status",
      "approved",
    ]);
    expect(approvedList.stdout).toContain("reviewed by: miguel");
    expect(approvedList.stdout).toContain("review note: Safe after backup");

    const applied = await runCommand([
      "suggestions",
      "review",
      suggestionId!,
      "--applied",
      "--reviewer",
      "hermes",
      "--note",
      "Underlying command completed",
    ]);
    expect(applied.exitCode).toBe(0);

    const appliedList = await runCommand([
      "suggestions",
      "list",
      "--status",
      "applied",
    ]);
    expect(appliedList.stdout).toContain("reviewed by: hermes");
    expect(appliedList.stdout).toContain("review note: Underlying command completed");
  });

  it("reports stale review attempts without changing the suggestion status", async () => {
    const store = new LocalStore(tmp.dbPath);
    let suggestionId: string;
    try {
      const suggestion = store.createCurationSuggestion({
        orgId: "test-org",
        repoId: "test-repo",
        type: "add_tags",
        priority: "low",
        memoryIds: ["missing-memory"],
        reason: "This suggestion became stale",
        confidence: 0.7,
      });
      suggestionId = suggestion.id;
    } finally {
      store.close();
    }

    const review = await runCommand([
      "suggestions",
      "review",
      suggestionId!,
      "--approve",
    ]);

    expect(review.exitCode).toBe(1);
    expect(review.stderr).toContain("Curation suggestion is stale: missing-memory");

    const checkedStore = new LocalStore(tmp.dbPath);
    try {
      expect(
        checkedStore.listCurationSuggestions({
          orgId: "test-org",
          repoId: "test-repo",
          status: ["pending"],
        }),
      ).toHaveLength(1);
    } finally {
      checkedStore.close();
    }
  });
});
