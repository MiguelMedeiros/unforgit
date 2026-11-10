import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { WebLocalStore } from "../../lib/local-store";

const testState = vi.hoisted(() => ({
  store: null as unknown,
  openaiCalls: 0,
}));

vi.mock("@/lib/stores", () => ({
  getConfig: () => ({ remote: { orgId: "test-org", repoId: "test-repo" } }),
  getLocalStore: () => testState.store,
}));

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async () => {
          testState.openaiCalls += 1;
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    text: "Merged fact",
                    suggestedTags: ["merged"],
                    suggestedType: "semantic",
                  }),
                },
              },
            ],
          };
        },
      },
    };
  },
}));

import { POST as execute } from "../../app/api/consolidation/execute/route";
import { POST as revert } from "../../app/api/consolidation/revert/route";

const originalOpenAIKey = process.env.OPENAI_API_KEY;

let tmpDir: string;
let store: WebLocalStore;
let firstId: string;
let secondId: string;

function storeMemory(text: string): string {
  return store.store({
    orgId: "test-org",
    repoId: "test-repo",
    memoryType: "semantic",
    visibility: "repo",
    text,
    tags: [],
  }).id;
}

function post(url: string, body: string) {
  return new NextRequest(url, {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

function memoryCount(): number {
  return store.list({ orgId: "test-org", repoId: "test-repo", limit: 1000 }).length;
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-openai-key";
  testState.openaiCalls = 0;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-consolidate-"));
  store = new WebLocalStore(path.join(tmpDir, "local.db"));
  testState.store = store;
  firstId = storeMemory("First fact");
  secondId = storeMemory("Second fact");
});

afterEach(() => {
  if (originalOpenAIKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAIKey;
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("POST /api/consolidation/execute validation", () => {
  it("returns 400 for a malformed JSON body", async () => {
    const res = await execute(post("http://localhost/api/consolidation/execute", "{not json"));
    expect(res.status).toBe(400);
    expect(testState.openaiCalls).toBe(0);
  });

  it.each([
    ["non-string ids", () => ({ sourceIds: [firstId, 42] })],
    ["blank ids", () => ({ sourceIds: [firstId, "   "] })],
    ["non-string model", () => ({ sourceIds: [firstId, secondId], model: 7 })],
  ])("returns 400 for %s without calling OpenAI", async (_label, makeBody) => {
    const body = makeBody();
    const res = await execute(
      post("http://localhost/api/consolidation/execute", JSON.stringify(body)),
    );
    expect(res.status).toBe(400);
    expect(testState.openaiCalls).toBe(0);
    expect(memoryCount()).toBe(2);
  });

  it("rejects duplicate source ids without calling OpenAI or creating a partial consolidation", async () => {
    const res = await execute(
      post(
        "http://localhost/api/consolidation/execute",
        JSON.stringify({ sourceIds: [firstId, firstId] }),
      ),
    );
    expect(res.status).toBe(400);
    expect(testState.openaiCalls).toBe(0);
    expect(memoryCount()).toBe(2);
  });

  it("still consolidates two distinct memories", async () => {
    const res = await execute(
      post(
        "http://localhost/api/consolidation/execute",
        JSON.stringify({ sourceIds: [firstId, secondId] }),
      ),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sourcesConsolidated).toBe(2);
    expect(store.getById(data.consolidatedId)?.isConsolidation).toBe(true);
    expect(testState.openaiCalls).toBe(1);
  });
});

describe("POST /api/consolidation/revert validation", () => {
  it("returns 400 for a malformed JSON body", async () => {
    const res = await revert(post("http://localhost/api/consolidation/revert", "{not json"));
    expect(res.status).toBe(400);
  });
});
