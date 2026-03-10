import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempHippoDir } from "../helpers.js";
import { LocalStore } from "@unforgit/db";
import { loadConfig, saveConfig } from "@unforgit/config";
import fs from "node:fs";
import YAML from "yaml";

describe("config command", () => {
  let tmpDir: ReturnType<typeof createTempHippoDir>;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = createTempHippoDir();
    process.chdir(tmpDir.dir);
    const store = new LocalStore(tmpDir.dbPath);
    store.close();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    tmpDir.cleanup();
  });

  it("loads config with validated fields", () => {
    const config = loadConfig(tmpDir.dir);
    expect(config.remote.url).toBe("http://localhost:3737");
    expect(config.remote.orgId).toBe("test-org");
    expect(config.defaults.visibility).toBe("auto");
    expect(config.defaults.memoryType).toBe("episodic");
  });

  it("strips deprecated openaiApiKey from loaded config", () => {
    const raw = YAML.parse(fs.readFileSync(tmpDir.configPath, "utf-8"));
    raw.openaiApiKey = "sk-test123";
    fs.writeFileSync(tmpDir.configPath, YAML.stringify(raw), "utf-8");

    const reloaded = loadConfig(tmpDir.dir);
    expect((reloaded as Record<string, unknown>).openaiApiKey).toBeUndefined();
  });

  it("preserves remotes when saving", () => {
    const config = loadConfig(tmpDir.dir);
    config.remotes = {
      origin: { url: "http://remote:3737", orgId: "org", repoId: "repo" },
      staging: { url: "http://staging:3737", orgId: "org", repoId: "repo" },
    };
    saveConfig(config, tmpDir.dir);

    const reloaded = loadConfig(tmpDir.dir);
    expect(reloaded.remotes).toBeDefined();
    expect(reloaded.remotes?.origin?.url).toBe("http://remote:3737");
    expect(reloaded.remotes?.staging?.url).toBe("http://staging:3737");
  });

  it("throws on invalid config", () => {
    fs.writeFileSync(tmpDir.configPath, YAML.stringify({ invalid: true }), "utf-8");
    expect(() => loadConfig(tmpDir.dir)).toThrow("Invalid unforgit.yaml");
  });

  it("throws when not initialized", () => {
    const emptyDir = fs.mkdtempSync("/tmp/hippo-empty-");
    try {
      expect(() => loadConfig(emptyDir)).toThrow("not initialized");
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
