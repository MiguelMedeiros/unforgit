import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempDataDir, writeConfig } from "./helpers.js";
import {
  loadConfig,
  saveConfig,
  isInitialized,
  getDataDir,
  getDbPath,
  getConfigPath,
  defaultConfig,
} from "unforgit-config";

describe("config", () => {
  let tmp: ReturnType<typeof createTempDataDir>;

  beforeEach(() => {
    tmp = createTempDataDir();
  });

  afterEach(() => {
    tmp.cleanup();
  });

  describe("isInitialized", () => {
    it("returns true when .unforgit dir and config exist", () => {
      expect(isInitialized(tmp.dir)).toBe(true);
    });

    it("returns false for non-existent directory", () => {
      expect(isInitialized("/tmp/nonexistent-" + Date.now())).toBe(false);
    });
  });

  describe("path helpers", () => {
    it("getDataDir returns correct path", () => {
      expect(getDataDir(tmp.dir)).toBe(tmp.dataDir);
    });

    it("getDbPath returns correct path", () => {
      expect(getDbPath(tmp.dir)).toContain("local.db");
    });

    it("getConfigPath returns correct path", () => {
      expect(getConfigPath(tmp.dir)).toContain("unforgit.yaml");
    });
  });

  describe("loadConfig", () => {
    it("loads valid config", () => {
      const config = loadConfig(tmp.dir);
      expect(config.remote.orgId).toBe("test-org");
      expect(config.remote.repoId).toBe("test-repo");
      expect(config.defaults.visibility).toBe("auto");
      expect(config.lifecycle?.ttlSecondsByType?.episodic).toBe(30 * 24 * 60 * 60);
      expect(config.lifecycle?.maintenance?.autoRunOnStore).toBe(true);
      expect(config.lifecycle?.maintenance?.autoRunOnRecall).toBe(true);
    });

    it("throws when not initialized", () => {
      expect(() => loadConfig("/tmp/nonexistent-" + Date.now())).toThrow(
        "not initialized",
      );
    });

    it("throws on invalid config schema", () => {
      writeConfig(tmp.configPath, {
        remote: { url: "http://localhost" },
      });
      expect(() => loadConfig(tmp.dir)).toThrow("Invalid unforgit.yaml");
    });

    it("throws on completely malformed YAML", () => {
      const fs = require("node:fs");
      fs.writeFileSync(tmp.configPath, "not: [valid: yaml: {", "utf-8");
      expect(() => loadConfig(tmp.dir)).toThrow();
    });
  });

  describe("saveConfig", () => {
    it("saves and reloads config", () => {
      const config = loadConfig(tmp.dir);
      config.remote.orgId = "new-org";
      saveConfig(config, tmp.dir);

      const reloaded = loadConfig(tmp.dir);
      expect(reloaded.remote.orgId).toBe("new-org");
    });

    it("writes config files with owner-only permissions", () => {
      const fs = require("node:fs");
      const config = loadConfig(tmp.dir);

      saveConfig(config, tmp.dir);

      expect(fs.statSync(tmp.configPath).mode & 0o777).toBe(0o600);
    });
  });

  describe("defaultConfig", () => {
    it("returns valid default config", () => {
      const config = defaultConfig();
      expect(config.remote.url).toBe("http://localhost:3737");
      expect(config.defaults.visibility).toBe("auto");
      expect(config.defaults.memoryType).toBe("episodic");
      expect(config.lifecycle?.usageBoost?.topKToRecord).toBe(5);
      expect(config.lifecycle?.maintenance?.debounceMs).toBe(30_000);
    });
  });
});
