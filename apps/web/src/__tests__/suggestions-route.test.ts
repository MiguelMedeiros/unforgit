import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { LocalStore } from "unforgit-db";

const testState = vi.hoisted(() => ({ dbPath: "" }));

vi.mock("@/lib/stores", () => ({
  getConfig: () => ({ remote: { orgId: "test-org", repoId: "test-repo" } }),
}));

vi.mock("@/lib/config", () => ({
  getDbPath: () => testState.dbPath,
}));

import { GET, POST } from "../../app/api/suggestions/route";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-suggestions-"));
  testState.dbPath = path.join(tmpDir, "local.db");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function reviewRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function seedActiveMemory(): void {
  const store = new LocalStore(testState.dbPath);
  try {
    const now = new Date();
    store.upsertFromRemote({
      id: "route-memory",
      orgId: "test-org",
      repoId: "test-repo",
      scopeType: "repo",
      memoryType: "semantic",
      visibility: "private",
      status: "active",
      text: "Route acceptance memory",
      tags: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  } finally {
    store.close();
  }
}

describe("suggestions review route", () => {
  it("does not generate durable suggestions through GET", async () => {
    seedActiveMemory();

    const response = await GET(
      new NextRequest("http://localhost/api/suggestions?generate=true"),
    );
    expect(response.status).toBe(200);

    const store = new LocalStore(testState.dbPath);
    try {
      expect(
        store.listCurationSuggestions({
          orgId: "test-org",
          repoId: "test-repo",
          status: ["pending"],
        }),
      ).toHaveLength(0);
    } finally {
      store.close();
    }
  });

  it("generates durable suggestions through JSON POST", async () => {
    seedActiveMemory();

    const response = await POST(reviewRequest({ action: "generate" }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.stats.created).toBeGreaterThan(0);
  });

  it("returns not found for an invalid suggestion id", async () => {
    const response = await POST(
      reviewRequest({ id: "missing", status: "approved", reviewedBy: "dashboard" }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Curation suggestion not found: missing",
    });
  });

  it("returns conflict for stale approvals and preserves the pending state", async () => {
    const store = new LocalStore(testState.dbPath);
    let suggestionId: string;
    try {
      suggestionId = store.createCurationSuggestion({
        orgId: "test-org",
        repoId: "test-repo",
        type: "add_tags",
        priority: "low",
        memoryIds: ["missing-memory"],
        reason: "The source memory was removed",
        confidence: 0.7,
      }).id;
    } finally {
      store.close();
    }

    const response = await POST(
      reviewRequest({ id: suggestionId!, status: "approved", reviewedBy: "dashboard" }),
    );

    expect(response.status).toBe(409);
    const checkedStore = new LocalStore(testState.dbPath);
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

  it("returns conflict for an invalid status transition and preserves the decision", async () => {
    const store = new LocalStore(testState.dbPath);
    let suggestionId: string;
    try {
      suggestionId = store.createCurationSuggestion({
        orgId: "test-org",
        repoId: "test-repo",
        type: "review",
        priority: "medium",
        memoryIds: [],
        reason: "Manual review required",
        confidence: 0.5,
      }).id;
      store.reviewCurationSuggestion({
        id: suggestionId,
        orgId: "test-org",
        repoId: "test-repo",
        status: "rejected",
        reviewedBy: "miguel",
        reviewNote: "Not actionable",
      });
    } finally {
      store.close();
    }

    const response = await POST(
      reviewRequest({ id: suggestionId!, status: "applied", reviewedBy: "dashboard" }),
    );

    expect(response.status).toBe(409);
    const checkedStore = new LocalStore(testState.dbPath);
    try {
      expect(
        checkedStore.listCurationSuggestions({
          orgId: "test-org",
          repoId: "test-repo",
          status: ["rejected"],
        }),
      ).toHaveLength(1);
    } finally {
      checkedStore.close();
    }
  });
});
