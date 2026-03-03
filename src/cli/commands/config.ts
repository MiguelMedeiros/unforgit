import { Command } from "commander";
import { loadConfig, saveConfig, isInitialized, getConfigPath } from "../config.js";
import fs from "node:fs";
import YAML from "yaml";
import type { HippoConfig } from "../../core/types.js";

interface ExtendedHippoConfig extends HippoConfig {
  openaiApiKey?: string;
  branches?: string[];
  currentBranch?: string;
}

function loadExtendedConfig(): ExtendedHippoConfig {
  const configPath = getConfigPath();
  const raw = fs.readFileSync(configPath, "utf-8");
  return YAML.parse(raw) as ExtendedHippoConfig;
}

function saveExtendedConfig(config: ExtendedHippoConfig): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");
}

export const configCommand = new Command("config")
  .description("Manage hippocampus configuration");

configCommand
  .command("list")
  .alias("ls")
  .description("List all configuration values")
  .action(() => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadExtendedConfig();

    console.log("Current configuration:\n");
    console.log("remote.url =", config.remote.url || "(not set)");
    console.log("remote.orgId =", config.remote.orgId || "(not set)");
    console.log("remote.repoId =", config.remote.repoId || "(not set)");
    console.log("remote.apiKey =", config.remote.apiKey ? `${config.remote.apiKey.slice(0, 10)}...` : "(not set)");
    console.log("openaiApiKey =", config.openaiApiKey ? `${config.openaiApiKey.slice(0, 10)}...` : "(not set)");
    console.log("defaults.visibility =", config.defaults.visibility);
    console.log("defaults.memoryType =", config.defaults.memoryType);
  });

configCommand
  .command("get")
  .description("Get a configuration value")
  .argument("<key>", "Configuration key (e.g., remote.url, openaiApiKey)")
  .action((key) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadExtendedConfig();
    const value = getConfigValue(config, key);

    if (value === undefined) {
      console.error(`fatal: key '${key}' not found`);
      process.exit(1);
    }

    if (key.includes("apiKey") || key.includes("ApiKey")) {
      console.log(value ? `${String(value).slice(0, 10)}...` : "(not set)");
    } else {
      console.log(value);
    }
  });

configCommand
  .command("set")
  .description("Set a configuration value")
  .argument("<key>", "Configuration key")
  .argument("<value>", "Value to set")
  .action((key, value) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadExtendedConfig();
    setConfigValue(config, key, value);
    saveExtendedConfig(config);

    if (key.includes("apiKey") || key.includes("ApiKey")) {
      console.log(`${key} = ${value.slice(0, 10)}...`);
    } else {
      console.log(`${key} = ${value}`);
    }
  });

configCommand
  .command("unset")
  .description("Remove a configuration value")
  .argument("<key>", "Configuration key to remove")
  .action((key) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadExtendedConfig();
    unsetConfigValue(config, key);
    saveExtendedConfig(config);

    console.log(`Unset ${key}`);
  });

function getConfigValue(config: ExtendedHippoConfig, key: string): unknown {
  const parts = key.split(".");
  let current: unknown = config;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

function setConfigValue(config: ExtendedHippoConfig, key: string, value: string): void {
  const parts = key.split(".");

  if (parts.length === 1) {
    (config as Record<string, unknown>)[key] = value;
    return;
  }

  let current: Record<string, unknown> = config as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

function unsetConfigValue(config: ExtendedHippoConfig, key: string): void {
  const parts = key.split(".");

  if (parts.length === 1) {
    delete (config as Record<string, unknown>)[key];
    return;
  }

  let current: Record<string, unknown> = config as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object") {
      return;
    }
    current = current[part] as Record<string, unknown>;
  }

  delete current[parts[parts.length - 1]];
}
