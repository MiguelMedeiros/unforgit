import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStore } from "unforgit-db";

import { WebLocalStore } from "../../lib/local-store";

const testState = vi.hoisted(() => ({
  store: null as unknown,
  config: null as unknown,
}));

vi.mock("@/lib/stores", () => ({
  getConfig: () => testState.config,
  getLocalStore: () => testState.store,
}));

import { POST as backfill } from "../../app/api/embeddings/backfill/route";

const ORG = "test-org";
const REPO = "test-repo";
const originalOpenAIKey = process.env.OPENAI_API_KEY;

let tmpDir: string;
let dbPath: string;
let webStore: WebLocalStore | null;

function seedMemory(id: string): void {
  const store = new LocalStore(dbPath);
  try {
    const now = new Date();
    store.upsertFromRemote({
      id,
      orgId: ORG,
      repoId: REPO,
      scopeType: "repo",
      memoryType: "semantic",
      visibility: "private",
      status: "active",
      text: `Backfill provider memory ${id}`,
      tags: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  } finally {
    store.close();
  }
}

function useConfig(embeddings?: { provider?: string; model?: string }): void {
  testState.config = {
    remote: { url: "", orgId: ORG, repoId: REPO },
    defaults: { visibility: "private", memoryType: "semantic" },
    ...(embeddings ? { embeddings } : {}),
  };
}

function openWebStore(): void {
  webStore = new WebLocalStore(dbPath);
  testState.store = webStore;
}

function embeddingRow(id: string) {
  const db = new Database(dbPath, { readonly: true });
  try {
    return db
      .prepare("SELECT model, provider, dimensions FROM memory_embeddings WHERE memory_id = ?")
      .get(id) as { model: string; provider: string | null; dimensions: number | null } | undefined;
  } finally {
    db.close();
  }
}

function recallableEmbeddingIds(dimensions: number): string[] {
  const store = new LocalStore(dbPath);
  try {
    return store.getAllEmbeddings(ORG, REPO, dimensions).map((row) => row.memoryId);
  } finally {
    store.close();
  }
}

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-backfill-"));
  dbPath = path.join(tmpDir, "local.db");
  webStore = null;
});

afterEach(() => {
  if (originalOpenAIKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAIKey;
  }
  (webStore as unknown as { db?: { close(): void } } | null)?.db?.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("POST /api/embeddings/backfill", () => {
  it("backfills with the configured local provider without an OpenAI key", async () => {
    seedMemory("local-memory");
    useConfig({ provider: "local" });
    openWebStore();

    const res = await backfill();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, processed: 1, errors: 0 });
    expect(embeddingRow("local-memory")).toEqual({
      model: "local-hash-multilingual-v1",
      provider: "local",
      dimensions: 384,
    });
  });

  it("stores embeddings that semantic recall can find by dimension", async () => {
    seedMemory("recallable-memory");
    useConfig();
    openWebStore();

    const res = await backfill();

    expect(res.status).toBe(200);
    expect(recallableEmbeddingIds(384)).toEqual(["recallable-memory"]);
  });

  it("regenerates embeddings that do not match the configured provider", async () => {
    seedMemory("stale-memory");
    const seed = new LocalStore(dbPath);
    try {
      await seed.storeEmbedding(
        "stale-memory",
        new Array<number>(1536).fill(0.01),
        "text-embedding-3-small",
        "openai",
      );
    } finally {
      seed.close();
    }
    useConfig({ provider: "local" });
    openWebStore();

    const res = await backfill();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, processed: 1 });
    expect(embeddingRow("stale-memory")).toMatchObject({ provider: "local", dimensions: 384 });
  });

  it("refuses an unavailable configured provider without storing embeddings", async () => {
    seedMemory("openai-memory");
    useConfig({ provider: "openai" });
    openWebStore();

    const res = await backfill();
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/OPENAI_API_KEY/);
    expect(embeddingRow("openai-memory")).toBeUndefined();
  });
});
