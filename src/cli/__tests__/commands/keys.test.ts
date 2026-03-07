import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mockFetch, restoreFetch } from "../helpers.js";
import { RemoteClient } from "../../remote-client.js";

describe("keys via RemoteClient", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("createApiKey sends correct request", async () => {
    mockFetch([{
      status: 200,
      body: { id: "key-id", key: "hk_test123", name: "Test Key", orgId: "my-org" },
    }]);

    const client = new RemoteClient("http://localhost:3737", "hk_admin");
    const result = await client.createApiKey("Test Key", "my-org");

    expect(result.id).toBe("key-id");
    expect(result.key).toBe("hk_test123");
    expect(result.name).toBe("Test Key");
    expect(result.orgId).toBe("my-org");
  });

  it("listApiKeys returns keys", async () => {
    mockFetch([{
      status: 200,
      body: {
        keys: [
          { id: "k1", name: "Key 1", orgId: "org", isActive: true, createdAt: "2024-01-01", lastUsedAt: null },
          { id: "k2", name: "Key 2", orgId: "org", isActive: false, createdAt: "2024-01-01", lastUsedAt: "2024-06-01" },
        ],
      },
    }]);

    const client = new RemoteClient("http://localhost:3737", "hk_admin");
    const result = await client.listApiKeys("org");

    expect(result.keys).toHaveLength(2);
    expect(result.keys[0].name).toBe("Key 1");
    expect(result.keys[1].isActive).toBe(false);
  });

  it("listApiKeys handles empty response", async () => {
    mockFetch([{ status: 200, body: { keys: [] } }]);

    const client = new RemoteClient("http://localhost:3737", "hk_admin");
    const result = await client.listApiKeys();

    expect(result.keys).toHaveLength(0);
  });

  it("revokeApiKey succeeds", async () => {
    mockFetch([{ status: 200, body: { ok: true } }]);

    const client = new RemoteClient("http://localhost:3737", "hk_admin");
    await expect(client.revokeApiKey("key-id")).resolves.not.toThrow();
  });

  it("revokeApiKey throws on 404", async () => {
    mockFetch([{ status: 404, body: "Not found" }]);

    const client = new RemoteClient("http://localhost:3737", "hk_admin");
    await expect(client.revokeApiKey("bad-id")).rejects.toThrow("not found");
  });

  it("createApiKey throws on auth failure", async () => {
    mockFetch([{ status: 401, body: "Unauthorized" }]);

    const client = new RemoteClient("http://localhost:3737", "bad-key");
    await expect(client.createApiKey("test", "org")).rejects.toThrow("Authentication failed");
  });
});
