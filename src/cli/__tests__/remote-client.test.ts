import { describe, it, expect, vi, afterEach } from "vitest";
import { RemoteClient } from "../remote-client.js";

const originalFetch = globalThis.fetch;

function mockFetch(responses: Array<{ status: number; body?: unknown; delay?: number }>) {
  let callIndex = 0;
  globalThis.fetch = vi.fn(async () => {
    const resp = responses[Math.min(callIndex++, responses.length - 1)];
    if (resp.delay) {
      await new Promise((r) => setTimeout(r, resp.delay));
    }
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: async () => resp.body,
      text: async () => JSON.stringify(resp.body ?? ""),
    } as Response;
  });
}

describe("RemoteClient", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    delete process.env.UNFORGIT_API_KEY;
  });

  describe("constructor", () => {
    it("uses provided apiKey", () => {
      const client = new RemoteClient("http://localhost", "hk_test");
      mockFetch([{ status: 200, body: { results: [] } }]);
      client.recall({ orgId: "o", repoId: "r", query: "q" });
      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].headers.Authorization).toBe("Bearer hk_test");
    });

    it("falls back to UNFORGIT_API_KEY env var", () => {
      process.env.UNFORGIT_API_KEY = "hk_env";
      const client = new RemoteClient("http://localhost");
      mockFetch([{ status: 200, body: { results: [] } }]);
      client.recall({ orgId: "o", repoId: "r", query: "q" });
      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].headers.Authorization).toBe("Bearer hk_env");
    });

    it("sends no auth header when no key provided", () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{ status: 200, body: { results: [] } }]);
      client.recall({ orgId: "o", repoId: "r", query: "q" });
      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].headers.Authorization).toBeUndefined();
    });
  });

  describe("store", () => {
    it("sends POST to /v1/memory", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{ status: 200, body: { id: "abc-123" } }]);

      const result = await client.store({
        orgId: "org",
        repoId: "repo",
        memoryType: "episodic",
        text: "test",
      });

      expect(result.id).toBe("abc-123");
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("throws auth error on 401", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{ status: 401, body: "Unauthorized" }]);

      await expect(
        client.store({ orgId: "o", repoId: "r", memoryType: "episodic", text: "t" }),
      ).rejects.toThrow("Authentication failed");
    });

    it("throws generic error on 400", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{ status: 400, body: "Bad request" }]);

      await expect(
        client.store({ orgId: "o", repoId: "r", memoryType: "episodic", text: "t" }),
      ).rejects.toThrow("Remote store failed (400)");
    });

    it("throws actionable error when reset endpoint is missing", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{
        status: 404,
        body: {
          message: "Route POST:/v1/memories/reset not found",
          error: "Not Found",
          statusCode: 404,
        },
      }]);

      await expect(
        client.resetAll("org", "repo"),
      ).rejects.toThrow("does not support /v1/memories/reset");
    });
  });

  describe("retry logic", () => {
    it("retries on 500 and succeeds", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([
        { status: 500, body: "Internal error" },
        { status: 200, body: { id: "ok" } },
      ]);

      const result = await client.store({
        orgId: "o",
        repoId: "r",
        memoryType: "episodic",
        text: "t",
      });

      expect(result.id).toBe("ok");
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("retries on 429 rate limit", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([
        { status: 429, body: "Rate limited" },
        { status: 200, body: { id: "ok" } },
      ]);

      const result = await client.store({
        orgId: "o",
        repoId: "r",
        memoryType: "episodic",
        text: "t",
      });

      expect(result.id).toBe("ok");
    });

    it("does NOT retry on 400", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{ status: 400, body: "Bad request" }]);

      await expect(
        client.store({ orgId: "o", repoId: "r", memoryType: "episodic", text: "t" }),
      ).rejects.toThrow();
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("fails after max retries on persistent 500", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([
        { status: 500, body: "error" },
        { status: 500, body: "error" },
        { status: 500, body: "error" },
      ]);

      await expect(
        client.store({ orgId: "o", repoId: "r", memoryType: "episodic", text: "t" }),
      ).rejects.toThrow("Remote store failed (500)");
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("timeout", () => {
    it("throws on timeout", async () => {
      const client = new RemoteClient("http://localhost", undefined, {
        timeoutMs: 50,
      });

      globalThis.fetch = vi.fn(((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }
        });
      }) as typeof fetch);

      await expect(
        client.recall({ orgId: "o", repoId: "r", query: "q" }),
      ).rejects.toThrow("timed out");
    }, 10_000);
  });

  describe("recall", () => {
    it("sends POST to /v1/recall", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{
        status: 200,
        body: {
          results: [
            { id: "1", memoryType: "episodic", text: "test", tags: [], score: 1, source: "remote" },
          ],
        },
      }]);

      const result = await client.recall({ orgId: "o", repoId: "r", query: "q" });
      expect(result.results).toHaveLength(1);
    });
  });

  describe("deprecate", () => {
    it("sends POST to deprecate endpoint", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{ status: 200, body: { ok: true } }]);

      const result = await client.deprecate("id-123", "outdated");
      expect(result.ok).toBe(true);
    });
  });

  describe("link / unlink / getLinks", () => {
    it("creates a link", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{
        status: 200,
        body: { link: { id: "l1", sourceId: "s", targetId: "t", linkType: "related_to" } },
      }]);

      const result = await client.link("s", "t", "related_to");
      expect(result.link.id).toBe("l1");
    });

    it("deletes a link", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{ status: 200, body: { ok: true } }]);

      const result = await client.unlink("s", "t", "related_to");
      expect(result.ok).toBe(true);
    });

    it("gets links", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{ status: 200, body: { links: [] } }]);

      const result = await client.getLinks("mem-1", "related_to");
      expect(result.links).toEqual([]);
    });
  });

  describe("delete / restore", () => {
    it("soft deletes a memory", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{ status: 200, body: { success: true, action: "soft_deleted" } }]);

      const result = await client.delete("id-1");
      expect(result.success).toBe(true);
    });

    it("restores a memory", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{ status: 200, body: { success: true } }]);

      const result = await client.restore("id-1");
      expect(result.success).toBe(true);
    });
  });

  describe("lifecycle maintenance", () => {
    it("sends POST to /v1/lifecycle/run", async () => {
      const client = new RemoteClient("http://localhost");
      mockFetch([{
        status: 200,
        body: {
          dryRun: true,
          totalActiveMemories: 3,
          expiredCandidates: [],
          expiredCount: 0,
          strengthenedCandidates: [],
          consolidationCandidates: [],
          executedConsolidations: [],
          warnings: [],
          errors: [],
        },
      }]);

      const result = await client.runLifecycle({
        orgId: "org",
        repoId: "repo",
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
