import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Legacy unforgit.yaml files may still contain secrets that the CLI now ignores
// (remote.apiKey, openaiApiKey). The dashboard reads the raw YAML, so the
// /api/config route must never echo those values back to the browser.
const legacyConfig = {
  configVersion: 2,
  openaiApiKey: "sk-legacy-openai-secret",
  remote: {
    url: "",
    orgId: "test-org",
    repoId: "test-repo",
    apiKey: "ufk_legacy-remote-secret",
  },
  defaults: { recallK: 8 },
};

vi.mock("@/lib/config", () => ({
  getConfig: () => structuredClone(legacyConfig),
  getDbPath: () => "/nonexistent/local.db",
  getDbFileSize: () => null,
  getWorkspacePath: () => "/nonexistent",
  isInitialized: () => true,
}));

import { GET as getConfigRoute } from "../../app/api/config/route";

describe("GET /api/config secret redaction", () => {
  const originalOpenAIKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalOpenAIKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenAIKey;
    }
  });

  it("omits legacy secrets from the returned config", async () => {
    const res = await getConfigRoute();
    const raw = await res.text();

    expect(raw).not.toContain("sk-legacy-openai-secret");
    expect(raw).not.toContain("ufk_legacy-remote-secret");

    const body = JSON.parse(raw);
    expect(body.config.openaiApiKey).toBeUndefined();
    expect(body.config.remote.apiKey).toBeUndefined();
  });

  it("keeps non-secret configuration intact", async () => {
    const body = await (await getConfigRoute()).json();

    expect(body.config.remote).toEqual({ url: "", orgId: "test-org", repoId: "test-repo" });
    expect(body.config.defaults).toEqual({ recallK: 8 });
    expect(body.config.configVersion).toBe(2);
  });
});
