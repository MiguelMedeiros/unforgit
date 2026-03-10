import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import YAML from "yaml";
import type { AppConfig } from "@unforgit/shared";
import { resolveLifecycleConfig } from "@unforgit/core";
import { appConfigSchema } from "./config-schemas.js";

const DATA_DIR = ".unforgit";
const CONFIG_FILE = "unforgit.yaml";
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

export function getDataDir(cwd: string = process.cwd()): string {
  return path.join(cwd, DATA_DIR);
}

export function getDbPath(cwd: string = process.cwd()): string {
  return path.join(getDataDir(cwd), DB_FILE);
}

export function getConfigPath(cwd: string = process.cwd()): string {
  return path.join(getDataDir(cwd), CONFIG_FILE);
}

export function isInitialized(cwd: string = process.cwd()): boolean {
  return fs.existsSync(getDataDir(cwd)) && fs.existsSync(getConfigPath(cwd));
}

export function findRepoRoot(startDir: string = process.cwd()): string | null {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (dir !== root) {
    if (isInitialized(dir)) return dir;
    dir = path.dirname(dir);
  }

  return null;
}

const CURRENT_CONFIG_VERSION = 2;

function migrateConfig(parsed: Record<string, unknown>, configPath: string): Record<string, unknown> {
  const version = (parsed.configVersion as number) ?? 0;

  if (version === CURRENT_CONFIG_VERSION) return parsed;

  if (version === 0) {
    parsed.configVersion = CURRENT_CONFIG_VERSION;
    fs.writeFileSync(configPath, YAML.stringify(parsed), "utf-8");
  }

  if (version === 1) {
    parsed.configVersion = CURRENT_CONFIG_VERSION;
    fs.writeFileSync(configPath, YAML.stringify(parsed), "utf-8");
  }

  return parsed;
}

function warnDeprecatedKeys(parsed: Record<string, unknown>): void {
  const deprecated: string[] = [];
  if ((parsed.remote as Record<string, unknown>)?.apiKey) {
    deprecated.push("remote.apiKey → use UNFORGIT_API_KEY env var instead");
  }
  if (parsed.openaiApiKey) {
    deprecated.push("openaiApiKey → use OPENAI_API_KEY env var instead");
  }
  if (deprecated.length > 0) {
    console.error(
      `[unforgit] Deprecated keys found in unforgit.yaml (ignored):\n${deprecated.map((d) => `  - ${d}`).join("\n")}\n` +
      `Remove them from your config. Secrets should be set via environment variables.\n`,
    );
  }
}

export function loadConfig(cwd: string = process.cwd()): AppConfig {
  const configPath = getConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    throw new Error(
      "Unforgit not initialized. Run 'unforgit init' first.",
    );
  }
  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = YAML.parse(raw) ?? {};

  const migrated = migrateConfig(parsed, configPath);

  warnDeprecatedKeys(migrated);

  const result = appConfigSchema.safeParse(migrated);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${(i.path as (string | number)[]).join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid unforgit.yaml configuration:\n${issues}\n\nFix the config at ${configPath} or re-run 'unforgit init'.`,
    );
  }

  const defaults = defaultConfig();

  const { openaiApiKey: _oai, ...cleanMigrated } = migrated as Record<string, unknown> & { openaiApiKey?: unknown };
  if (cleanMigrated.remote && typeof cleanMigrated.remote === "object") {
    const { apiKey: _ak, ...cleanRemote } = cleanMigrated.remote as Record<string, unknown>;
    cleanMigrated.remote = cleanRemote;
  }

  return {
    ...defaults,
    ...cleanMigrated,
    ...result.data,
    remote: {
      ...defaults.remote,
      ...result.data.remote,
    },
    defaults: {
      ...defaults.defaults,
      ...result.data.defaults,
    },
    sync: {
      ...defaults.sync,
      ...(result.data.sync ?? {}),
    },
    embeddings: {
      ...defaults.embeddings,
      ...(result.data.embeddings ?? {}),
    },
    lifecycle: resolveLifecycleConfig(result.data.lifecycle),
  } as AppConfig;
}

export function saveConfig(
  config: AppConfig,
  cwd: string = process.cwd(),
): void {
  const configPath = getConfigPath(cwd);
  fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");
}

export function defaultConfig(): AppConfig & { configVersion: number } {
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
    lifecycle: resolveLifecycleConfig(),
  };
}
