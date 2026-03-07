import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import YAML from "yaml";
import type { HippoConfig } from "../core/types.js";
import { hippoConfigSchema } from "./schemas.js";

const HIPPO_DIR = ".hippocampus";
const CONFIG_FILE = "hippo.yaml";
const DB_FILE = "local.db";

export function detectGitInfo(cwd: string = process.cwd()): {
  orgId: string;
  repoId: string;
} {
  try {
    const remoteUrl = execSync("git remote get-url origin", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // Handles both SSH (git@github.com:org/repo.git) and HTTPS (https://github.com/org/repo.git)
    const match =
      remoteUrl.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/) ?? undefined;

    if (match) {
      return { orgId: match[1], repoId: match[2] };
    }
  } catch {
    // Not a git repo or no remote configured
  }
  return { orgId: "", repoId: "" };
}

export function getHippoDir(cwd: string = process.cwd()): string {
  return path.join(cwd, HIPPO_DIR);
}

export function getDbPath(cwd: string = process.cwd()): string {
  return path.join(getHippoDir(cwd), DB_FILE);
}

export function getConfigPath(cwd: string = process.cwd()): string {
  return path.join(getHippoDir(cwd), CONFIG_FILE);
}

export function isInitialized(cwd: string = process.cwd()): boolean {
  return fs.existsSync(getHippoDir(cwd)) && fs.existsSync(getConfigPath(cwd));
}

const CURRENT_CONFIG_VERSION = 1;

function migrateConfig(parsed: Record<string, unknown>, configPath: string): Record<string, unknown> {
  const version = (parsed.configVersion as number) ?? 0;

  if (version === CURRENT_CONFIG_VERSION) return parsed;

  if (version === 0) {
    parsed.configVersion = CURRENT_CONFIG_VERSION;
    fs.writeFileSync(configPath, YAML.stringify(parsed), "utf-8");
  }

  return parsed;
}

export function loadConfig(cwd: string = process.cwd()): HippoConfig {
  const configPath = getConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    throw new Error(
      "Hippocampus not initialized. Run 'hippo init' first.",
    );
  }
  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = YAML.parse(raw) ?? {};

  const migrated = migrateConfig(parsed, configPath);

  const result = hippoConfigSchema.safeParse(migrated);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${(i.path as (string | number)[]).join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid hippo.yaml configuration:\n${issues}\n\nFix the config at ${configPath} or re-run 'hippo init'.`,
    );
  }

  return { ...migrated, ...result.data } as HippoConfig;
}

export function saveConfig(
  config: HippoConfig,
  cwd: string = process.cwd(),
): void {
  const configPath = getConfigPath(cwd);
  fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");
}

export function defaultConfig(): HippoConfig & { configVersion: number } {
  return {
    configVersion: CURRENT_CONFIG_VERSION,
    remote: {
      url: "http://localhost:3737",
      orgId: "",
      repoId: "",
    },
    defaults: {
      visibility: "auto",
      memoryType: "episodic",
    },
    sync: {
      enabled: true,
      intervalMs: 60000,
      debounceMs: 5000,
      autoResolveConflicts: "last_write_wins",
    },
    embeddings: {
      enabled: true,
      model: "text-embedding-3-small",
      autoGenerate: true,
    },
  };
}
