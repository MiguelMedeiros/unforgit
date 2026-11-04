import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-proxy", () => import("../../lib/api-proxy"));

import { GET as getMemories } from "../../app/api/repo/[org]/[repo]/memories/route";
import { GET as getLinks } from "../../app/api/repo/[org]/[repo]/links/route";
import { GET as getStats } from "../../app/api/repo/[org]/[repo]/stats/route";
import { GET as getStatsTags } from "../../app/api/repo/[org]/[repo]/stats/tags/route";
import { GET as getActivity } from "../../app/api/repo/[org]/[repo]/stats/activity/route";
import { GET as getTimeline } from "../../app/api/repo/[org]/[repo]/timeline/route";
import { GET as getGraph } from "../../app/api/repo/[org]/[repo]/graph/route";
import { GET as getLogs } from "../../app/api/repo/[org]/[repo]/logs/route";
import { GET as getHistory } from "../../app/api/repo/[org]/[repo]/consolidation/history/route";
import { GET as getCandidates } from "../../app/api/repo/[org]/[repo]/consolidation/candidates/route";
import { POST as executeConsolidation } from "../../app/api/repo/[org]/[repo]/consolidation/execute/route";
import { PATCH as patchKey, DELETE as deleteKey } from "../../app/api/keys/[id]/route";
import { GET as getUser, DELETE as deleteUser } from "../../app/api/users/[id]/route";
import { PATCH as toggleAdmin } from "../../app/api/users/[id]/admin/route";
import { POST as createUserKey } from "../../app/api/users/[id]/api-keys/route";

const HOSTILE_ORG = "../../users/victim?x=";
const HOSTILE_REPO = "../repo#frag";
const HOSTILE_ID = "../users/victim/admin?x=";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () =>
    new Response(
      JSON.stringify({ memories: [], links: [], dailyCounts: [], hourlyCounts: [], weeklyTrend: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function req(method = "GET", body?: unknown) {
  return new NextRequest("http://localhost/api/x", {
    method,
    headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function requestedPaths(): string[] {
  return fetchMock.mock.calls.map((call) => {
    const url = new URL(String(call[0]));
    return `${url.pathname}${url.search}${url.hash}`;
  });
}

const encOrg = encodeURIComponent(HOSTILE_ORG);
const encRepo = encodeURIComponent(HOSTILE_REPO);
const repoBase = `/v1/admin/repos/${encOrg}/${encRepo}`;
const repoParams = { params: Promise.resolve({ org: HOSTILE_ORG, repo: HOSTILE_REPO }) };

describe("admin repository proxies keep org/repo inside their path segments", () => {
  it.each([
    ["memories", getMemories, `${repoBase}/memories`],
    ["links", getLinks, `${repoBase}/links`],
    ["stats", getStats, `${repoBase}/stats`],
    ["stats/tags", getStatsTags, `${repoBase}/stats/tags`],
    ["stats/activity", getActivity, `${repoBase}/stats/activity`],
    ["consolidation/history", getHistory, `${repoBase}/consolidation/history`],
  ])("%s", async (_name, handler, expected) => {
    await handler(req(), { params: Promise.resolve({ org: HOSTILE_ORG, repo: HOSTILE_REPO }) });
    expect(requestedPaths()).toEqual([expected]);
  });

  it("timeline", async () => {
    await getTimeline(req(), repoParams);
    expect(requestedPaths()).toEqual([`${repoBase}/memories?limit=1000&offset=0`]);
  });

  it("graph", async () => {
    await getGraph(req(), { params: Promise.resolve({ org: HOSTILE_ORG, repo: HOSTILE_REPO }) });
    expect(requestedPaths().sort()).toEqual(
      [`${repoBase}/links`, `${repoBase}/memories?limit=1000&offset=0`].sort(),
    );
  });

  it("logs", async () => {
    await getLogs(req(), { params: Promise.resolve({ org: HOSTILE_ORG, repo: HOSTILE_REPO }) });
    expect(requestedPaths()).toEqual([`/v1/auth/me/logs/repo/${encOrg}/${encRepo}`]);
  });

  it("consolidation/candidates", async () => {
    await getCandidates(req(), { params: Promise.resolve({ org: HOSTILE_ORG, repo: HOSTILE_REPO }) });
    expect(requestedPaths()).toEqual([`${repoBase}/consolidation/candidates`]);
  });

  it("consolidation/execute", async () => {
    await executeConsolidation(req("POST", { sourceIds: ["a", "b"] }), {
      params: Promise.resolve({ org: HOSTILE_ORG, repo: HOSTILE_REPO }),
    });
    expect(requestedPaths()).toEqual([`${repoBase}/consolidation/execute`]);
  });
});

describe("admin key/user proxies keep IDs inside one path segment", () => {
  const encId = encodeURIComponent(HOSTILE_ID);
  const idParams = () => ({ params: Promise.resolve({ id: HOSTILE_ID }) });

  it("PATCH /api/keys/:id", async () => {
    await patchKey(req("PATCH", {}), idParams());
    expect(requestedPaths()).toEqual([`/v1/admin/api-keys/${encId}`]);
  });

  it("DELETE /api/keys/:id", async () => {
    await deleteKey(req("DELETE"), idParams());
    expect(requestedPaths()).toEqual([`/v1/admin/api-keys/${encId}`]);
  });

  it("GET /api/users/:id", async () => {
    await getUser(req(), idParams());
    expect(requestedPaths()).toEqual([`/v1/admin/users/${encId}`]);
  });

  it("DELETE /api/users/:id", async () => {
    await deleteUser(req("DELETE"), idParams());
    expect(requestedPaths()).toEqual([`/v1/admin/users/${encId}`]);
  });

  it("PATCH /api/users/:id/admin", async () => {
    await toggleAdmin(req("PATCH"), idParams());
    expect(requestedPaths()).toEqual([`/v1/admin/users/${encId}/admin`]);
  });

  it("POST /api/users/:id/api-keys", async () => {
    await createUserKey(req("POST", { name: "k" }), idParams());
    expect(requestedPaths()).toEqual([`/v1/admin/users/${encId}/api-keys`]);
  });
});
