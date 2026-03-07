import { Command } from "commander";
import { isInitialized, loadConfig, saveConfig } from "../config.js";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR, EXIT_ERROR } from "../exit-codes.js";
import { maskKey, isJsonMode, outputJson } from "../utils.js";
import type { HippoConfig } from "../../core/types.js";

export const configCommand = new Command("config")
  .description("Manage hippocampus configuration");

configCommand
  .command("list")
  .alias("ls")
  .description("List all configuration values")
  .action(() => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();

    if (isJsonMode()) {
      const safeConfig = { ...config };
      if (safeConfig.remote.apiKey) safeConfig.remote = { ...safeConfig.remote, apiKey: maskKey(safeConfig.remote.apiKey) };
      if (safeConfig.openaiApiKey) safeConfig.openaiApiKey = maskKey(safeConfig.openaiApiKey);
      outputJson(safeConfig);
      return;
    }

    logger.info("Current configuration:\n");
    logger.info(`remote.url = ${config.remote.url || "(not set)"}`);
    logger.info(`remote.orgId = ${config.remote.orgId || "(not set)"}`);
    logger.info(`remote.repoId = ${config.remote.repoId || "(not set)"}`);
    logger.info(`remote.apiKey = ${config.remote.apiKey ? maskKey(config.remote.apiKey) : "(not set)"}`);
    logger.info(`openaiApiKey = ${config.openaiApiKey ? maskKey(config.openaiApiKey) : "(not set)"}`);
    logger.info(`defaults.visibility = ${config.defaults.visibility}`);
    logger.info(`defaults.memoryType = ${config.defaults.memoryType}`);
  });

configCommand
  .command("get")
  .description("Get a configuration value")
  .argument("<key>", "Configuration key (e.g., remote.url, openaiApiKey)")
  .action((key) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const value = getConfigValue(config, key);

    if (value === undefined) {
      logger.fatal(`key '${key}' not found`);
      process.exit(EXIT_ERROR);
    }

    if (isJsonMode()) {
      outputJson({ key, value: key.includes("apiKey") || key.includes("ApiKey") ? maskKey(String(value)) : value });
      return;
    }

    if (key.includes("apiKey") || key.includes("ApiKey")) {
      logger.info(value ? maskKey(String(value)) : "(not set)");
    } else {
      logger.info(String(value));
    }
  });

const VALID_CONFIG_KEYS = [
  "remote.url",
  "remote.orgId",
  "remote.repoId",
  "remote.apiKey",
  "defaults.visibility",
  "defaults.memoryType",
  "openaiApiKey",
  "configVersion",
] as const;

configCommand
  .command("set")
  .description("Set a configuration value")
  .argument("<key>", "Configuration key")
  .argument("<value>", "Value to set")
  .addHelpText("after", `
Valid keys: ${VALID_CONFIG_KEYS.join(", ")}

Examples:
  hippo config set remote.url http://my-server:3737
  hippo config set defaults.memoryType semantic`)
  .action((key, value) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    if (!VALID_CONFIG_KEYS.includes(key as (typeof VALID_CONFIG_KEYS)[number])) {
      logger.error(
        `Unknown config key "${key}". Valid keys: ${VALID_CONFIG_KEYS.join(", ")}`,
      );
      process.exit(EXIT_ERROR);
    }

    const config = loadConfig();
    setConfigValue(config, key, value);
    saveConfig(config);

    if (key.includes("apiKey") || key.includes("ApiKey")) {
      logger.info(`${key} = ${maskKey(value)}`);
    } else {
      logger.info(`${key} = ${value}`);
    }
  });

configCommand
  .command("unset")
  .description("Remove a configuration value")
  .argument("<key>", "Configuration key to remove")
  .action((key) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    unsetConfigValue(config, key);
    saveConfig(config);

    logger.info(`Unset ${key}`);
  });

function getConfigValue(config: HippoConfig, key: string): unknown {
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

function setConfigValue(config: HippoConfig, key: string, value: string): void {
  const parts = key.split(".");

  if (parts.length === 1) {
    (config as unknown as Record<string, unknown>)[key] = value;
    return;
  }

  let current: Record<string, unknown> = config as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

function unsetConfigValue(config: HippoConfig, key: string): void {
  const parts = key.split(".");

  if (parts.length === 1) {
    delete (config as unknown as Record<string, unknown>)[key];
    return;
  }

  let current: Record<string, unknown> = config as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object") {
      return;
    }
    current = current[part] as Record<string, unknown>;
  }

  delete current[parts[parts.length - 1]];
}
