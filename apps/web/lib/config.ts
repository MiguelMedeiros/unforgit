import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { AppConfig } from "./types";

export function getWorkspacePath(): string {
  const workspace = process.env.UNFORGIT_WORKSPACE || process.cwd();
  return path.resolve(process.cwd(), workspace);
}

export function getDataDir(): string {
  return path.join(getWorkspacePath(), ".unforgit");
}

export function getDbPath(): string {
  return path.join(getDataDir(), "local.db");
}

export function getConfigPath(): string {
  return path.join(getDataDir(), "unforgit.yaml");
}

export function loadConfig(): AppConfig | null {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return null;
  const raw = fs.readFileSync(configPath, "utf-8");
  return YAML.parse(raw) as AppConfig;
}

export const getConfig = loadConfig;

export function getDbFileSize(): number | null {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return null;
  return fs.statSync(dbPath).size;
}

export function isInitialized(): boolean {
  return fs.existsSync(getDataDir()) && fs.existsSync(getConfigPath());
}
