import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import YAML from "yaml";
import type { HippoConfig } from "../../core/types.js";

export function createTempHippoDir(configOverrides?: Partial<HippoConfig>): {
  dir: string;
  hippoDir: string;
  configPath: string;
  dbPath: string;
  cleanup: () => void;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hippo-test-"));
  const hippoDir = path.join(dir, ".hippocampus");
  fs.mkdirSync(hippoDir, { recursive: true });

  const config: HippoConfig = {
    remote: {
      url: "http://localhost:3737",
      orgId: "test-org",
      repoId: "test-repo",
      ...configOverrides?.remote,
    },
    defaults: {
      visibility: "auto",
      memoryType: "episodic",
      ...configOverrides?.defaults,
    },
    sync: {
      enabled: true,
      intervalMs: 60000,
      debounceMs: 5000,
      autoResolveConflicts: "last_write_wins",
      ...configOverrides?.sync,
    },
    embeddings: {
      enabled: true,
      model: "text-embedding-3-small",
      autoGenerate: true,
      ...configOverrides?.embeddings,
    },
  };

  const configPath = path.join(hippoDir, "hippo.yaml");
  fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");

  const dbPath = path.join(hippoDir, "local.db");

  return {
    dir,
    hippoDir,
    configPath,
    dbPath,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

export function writeConfig(configPath: string, config: Record<string, unknown>): void {
  fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");
}
