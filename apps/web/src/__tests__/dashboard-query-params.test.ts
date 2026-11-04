import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { WebLocalStore } from "../../lib/local-store";

const testState = vi.hoisted(() => ({ store: null as unknown, dbPath: "" }));

vi.mock("@/lib/remote-headers", () => ({ getRemoteHeaders: () => ({}) }));

vi.mock("@/lib/stores", () => ({
  getConfig: () => ({ remote: { orgId: "test-org", repoId: "test-repo" } }),
  getLocalStore: () => testState.store,
}));

vi.mock("@/lib/config", () => ({
  getDbPath: () => testState.dbPath,
}));

import { GET as activity } from "../../app/api/stats/activity/route";
import { GET as tags } from "../../app/api/stats/tags/route";
import { GET as suggestions } from "../../app/api/suggestions/route";
import { GET as history } from "../../app/api/consolidation/history/route";
import { GET as candidates } from "../../app/api/consolidation/candidates/route";

let tmpDir: string;
let store: WebLocalStore;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-web-query-params-"));
  testState.dbPath = path.join(tmpDir, "local.db");
  store = new WebLocalStore(testState.dbPath);
  testState.store = store;
  for (let i = 0; i < 3; i++) {
    store.store({
      orgId: "test-org",
      repoId: "test-repo",
      memoryType: "semantic",
      visibility: "repo",
      text: `Query param memory ${i}`,
      tags: ["alpha", "beta"],
    });
  }
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

type Handler = (request: NextRequest) => Promise<Response>;

const cases: Array<[string, Handler, string, string[], string]> = [
  ["/api/stats/activity", activity, "days", ["abc", "0", "-1", "1.5", "1e3"], "days=7"],
  ["/api/stats/tags", tags, "limit", ["abc", "0", "-1", "2.5"], "limit=1"],
  ["/api/suggestions", suggestions, "max", ["abc", "0", "-3", "1.5"], "max=5"],
  ["/api/consolidation/history", history, "limit", ["abc", "0", "-1"], "limit=5"],
  ["/api/consolidation/candidates", candidates, "maxGroups", ["abc", "0", "-1"], "maxGroups=5"],
  ["/api/consolidation/candidates", candidates, "offset", ["abc", "-1", "0.5"], "offset=0"],
  ["/api/consolidation/candidates", candidates, "minGroupSize", ["abc", "1", "-2"], "minGroupSize=2"],
  ["/api/consolidation/candidates", candidates, "threshold", ["abc", "-0.1", "1.5", "NaN", ""], "threshold=0.5"],
];

describe("dashboard numeric query params", () => {
  for (const [route, handler, name, badValues, validQuery] of cases) {
    it.each(badValues)(`${route} rejects ${name}=%s with 400`, async (value) => {
      const res = await handler(
        new NextRequest(`http://localhost${route}?${name}=${encodeURIComponent(value)}`),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain(name);
    });

    it(`${route} accepts ${validQuery}`, async () => {
      const res = await handler(new NextRequest(`http://localhost${route}?${validQuery}`));
      expect(res.status).toBe(200);
    });
  }

  it("/api/stats/tags still applies a valid limit", async () => {
    const res = await tags(new NextRequest("http://localhost/api/stats/tags?limit=1"));
    const body = await res.json();
    expect(body.tags).toHaveLength(1);
  });

  it("routes keep working with default params", async () => {
    for (const [route, handler] of [
      ["/api/stats/activity", activity],
      ["/api/stats/tags", tags],
      ["/api/suggestions", suggestions],
      ["/api/consolidation/history", history],
      ["/api/consolidation/candidates", candidates],
    ] as const) {
      const res = await handler(new NextRequest(`http://localhost${route}`));
      expect(res.status, route).toBe(200);
    }
  });
});
