import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { LocalStore } from "unforgit-db";

const testState = vi.hoisted(() => ({ dbPath: "", store: null as unknown }));

vi.mock("@/lib/config", () => ({
  getDbPath: () => testState.dbPath,
}));

// The web app's "@/" alias is not configured for vitest; map the real helper.
vi.mock("@/lib/remote-headers", () => import("../../lib/remote-headers"));

vi.mock("@/lib/stores", async () => {
  const { WebLocalStore } = await import("../../lib/local-store");
  return {
    getConfig: () => ({
      remote: {
        url: "https://remote.example.test",
        orgId: "test-org",
        repoId: "test-repo",
      },
    }),
    getLocalStore: () => {
      testState.store ??= new WebLocalStore(testState.dbPath);
      return testState.store;
    },
  };
});

import { GET as listMemories } from "../../app/api/memories/route";
import { GET as getMemory } from "../../app/api/memories/[id]/route";
import { POST as promoteMemory } from "../../app/api/memories/[id]/promote/route";
import { POST as restoreMemory } from "../../app/api/memories/[id]/restore/route";

const ORIGINAL_API_KEY = process.env.UNFORGIT_API_KEY;
let tmpDir: string;
let fetchMock: ReturnType<typeof vi.fn>;

function seedMemory(status: "active" | "deleted" = "active"): void {
  const store = new LocalStore(testState.dbPath);
  try {
    const now = new Date();
    store.upsertFromRemote({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "test-org",
      repoId: "test-repo",
      scopeType: "repo",
      memoryType: "semantic",
      visibility: "private",
      status,
      text: "Remote auth header regression memory",
      tags: [],
      version: 1,
      deletedAt: status === "deleted" ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });
  } finally {
    store.close();
  }
}

function authHeaderOf(call: unknown[]): string | null {
  const init = (call[1] ?? {}) as RequestInit;
  return new Headers(init.headers).get("authorization");
}

const routeParams = {
  params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-remote-auth-"));
  testState.dbPath = path.join(tmpDir, "local.db");
  process.env.UNFORGIT_API_KEY = "hk_test_remote_key";
  fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ id: "remote-id", memories: [], total: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  testState.store = null;
  if (ORIGINAL_API_KEY === undefined) {
    delete process.env.UNFORGIT_API_KEY;
  } else {
    process.env.UNFORGIT_API_KEY = ORIGINAL_API_KEY;
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("dashboard routes authenticate remote API calls", () => {
  it("promote sends the configured API key to POST /v1/memory", async () => {
    seedMemory();

    const res = await promoteMemory(
      new NextRequest("http://localhost/api/memories/x/promote", { method: "POST" }),
      routeParams,
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe("Bearer hk_test_remote_key");
  });

  it("restore sends the configured API key to the remote restore endpoint", async () => {
    seedMemory("deleted");

    const res = await restoreMemory(
      new NextRequest("http://localhost/api/memories/x/restore", { method: "POST" }),
      routeParams,
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe("Bearer hk_test_remote_key");
  });

  it("remote memory listing sends the configured API key", async () => {
    const res = await listMemories(
      new NextRequest("http://localhost/api/memories?source=remote"),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe("Bearer hk_test_remote_key");
  });

  it("remote memory detail sends the configured API key", async () => {
    await getMemory(
      new NextRequest("http://localhost/api/memories/x?source=remote"),
      routeParams,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe("Bearer hk_test_remote_key");
  });

  it("omits the Authorization header when no API key is configured", async () => {
    delete process.env.UNFORGIT_API_KEY;

    await listMemories(new NextRequest("http://localhost/api/memories?source=remote"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBeNull();
  });
});
