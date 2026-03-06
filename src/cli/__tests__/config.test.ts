import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempHippoDir, writeConfig } from "./helpers.js";
import {
  loadConfig,
  saveConfig,
  isInitialized,
  getHippoDir,
  getDbPath,
  getConfigPath,
  defaultConfig,
} from "../config.js";

describe("config", () => {
  let tmp: ReturnType<typeof createTempHippoDir>;

  beforeEach(() => {
    tmp = createTempHippoDir();
  });

  afterEach(() => {
    tmp.cleanup();
  });

  describe("isInitialized", () => {
    it("returns true when .hippocampus dir and config exist", () => {
      expect(isInitialized(tmp.dir)).toBe(true);
    });

    it("returns false for non-existent directory", () => {
      expect(isInitialized("/tmp/nonexistent-" + Date.now())).toBe(false);
    });
  });

  describe("path helpers", () => {
    it("getHippoDir returns correct path", () => {
      expect(getHippoDir(tmp.dir)).toBe(tmp.hippoDir);
    });

    it("getDbPath returns correct path", () => {
      expect(getDbPath(tmp.dir)).toContain("local.db");
    });

    it("getConfigPath returns correct path", () => {
      expect(getConfigPath(tmp.dir)).toContain("hippo.yaml");
    });
  });

  describe("loadConfig", () => {
    it("loads valid config", () => {
      const config = loadConfig(tmp.dir);
      expect(config.remote.orgId).toBe("test-org");
      expect(config.remote.repoId).toBe("test-repo");
      expect(config.defaults.visibility).toBe("auto");
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
      expect(() => loadConfig(tmp.dir)).toThrow("Invalid hippo.yaml");
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
  });

  describe("defaultConfig", () => {
    it("returns valid default config", () => {
      const config = defaultConfig();
      expect(config.remote.url).toBe("http://localhost:3737");
      expect(config.defaults.visibility).toBe("auto");
      expect(config.defaults.memoryType).toBe("episodic");
    });
  });
});
