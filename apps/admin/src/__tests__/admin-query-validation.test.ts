import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-proxy", () => import("../../lib/api-proxy"));

import { GET as getTimeline } from "../../app/api/repo/[org]/[repo]/timeline/route";
import { GET as getCandidates } from "../../app/api/repo/[org]/[repo]/consolidation/candidates/route";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () =>
    new Response(
      JSON.stringify({ memories: [], candidates: [], totalMemoriesScanned: 0, totalCandidateGroups: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const repoParams = () => ({ params: Promise.resolve({ org: "org", repo: "repo" }) });

function req(query: string) {
  return new NextRequest(`http://localhost/api/x${query}`, {
    headers: { Authorization: "Bearer test-token" },
  });
}

describe("admin timeline pagination", () => {
  it.each(["?limit=abc", "?limit=0", "?limit=-5", "?offset=-1", "?offset=1.5"])(
    "rejects %s before fetching memories",
    async (query) => {
      const response = await getTimeline(req(query), repoParams());
      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("accepts valid pagination", async () => {
    const response = await getTimeline(req("?limit=10&offset=5"), repoParams());
    expect(response.status).toBe(200);
  });
});

describe("admin consolidation candidates proxy", () => {
  it.each(["?threshold=abc", "?threshold=2", "?maxGroups=0", "?maxGroups=abc", "?offset=-1"])(
    "rejects %s before calling the API",
    async (query) => {
      const response = await getCandidates(req(query), repoParams());
      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("forwards the requested offset so Load more returns the next page", async () => {
    const response = await getCandidates(req("?threshold=0.5&maxGroups=10&offset=10"), repoParams());
    expect(response.status).toBe(200);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      threshold: 0.5,
      maxGroups: 10,
      minGroupSize: 2,
      offset: 10,
    });
  });
});
