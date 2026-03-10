import { Command } from "commander";
import { isInitialized, loadConfig, saveConfig } from "@unforgit/config";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR, EXIT_ERROR } from "../exit-codes.js";
import { isJsonMode, outputJson } from "../utils.js";
import type { AppConfig } from "@unforgit/shared";

export const configCommand = new Command("config")
  .description("Manage unforgit configuration");

configCommand
  .command("list")
  .alias("ls")
  .description("List all configuration values")
  .action(() => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();

    if (isJsonMode()) {
      outputJson(config);
      return;
    }

    logger.info("Current configuration:\n");
    logger.info(`remote.url = ${config.remote.url || "(not set)"}`);
    logger.info(`remote.orgId = ${config.remote.orgId || "(not set)"}`);
    logger.info(`remote.repoId = ${config.remote.repoId || "(not set)"}`);
    logger.info(`defaults.visibility = ${config.defaults.visibility}`);
    logger.info(`defaults.memoryType = ${config.defaults.memoryType}`);
    logger.info(`lifecycle.ttlSecondsByType.episodic = ${config.lifecycle?.ttlSecondsByType?.episodic ?? "(none)"}`);
    logger.info(`lifecycle.usageBoost.topKToRecord = ${config.lifecycle?.usageBoost?.topKToRecord ?? "(not set)"}`);
    logger.info(`lifecycle.usageBoost.minUsageCount = ${config.lifecycle?.usageBoost?.minUsageCount ?? "(not set)"}`);
    logger.info(`lifecycle.usageBoost.maxBoost = ${config.lifecycle?.usageBoost?.maxBoost ?? "(not set)"}`);
    logger.info(`lifecycle.usageBoost.halfLifeDays = ${config.lifecycle?.usageBoost?.halfLifeDays ?? "(not set)"}`);
    logger.info(`lifecycle.maintenance.staleEpisodicDays = ${config.lifecycle?.maintenance?.staleEpisodicDays ?? "(not set)"}`);
    logger.info(`lifecycle.maintenance.consolidationThreshold = ${config.lifecycle?.maintenance?.consolidationThreshold ?? "(not set)"}`);
    logger.info(`lifecycle.maintenance.consolidationMinGroupSize = ${config.lifecycle?.maintenance?.consolidationMinGroupSize ?? "(not set)"}`);
    logger.info(`lifecycle.maintenance.consolidationMaxGroups = ${config.lifecycle?.maintenance?.consolidationMaxGroups ?? "(not set)"}`);
    logger.info(`lifecycle.maintenance.promoteRecallCount = ${config.lifecycle?.maintenance?.promoteRecallCount ?? "(not set)"}`);
    logger.info(`lifecycle.maintenance.pinRecallCount = ${config.lifecycle?.maintenance?.pinRecallCount ?? "(not set)"}`);
    logger.info(`lifecycle.maintenance.dryRunDefault = ${config.lifecycle?.maintenance?.dryRunDefault ?? "(not set)"}`);
    logger.info(`lifecycle.maintenance.autoRunOnStore = ${config.lifecycle?.maintenance?.autoRunOnStore ?? "(not set)"}`);
    logger.info(`lifecycle.maintenance.autoRunOnRecall = ${config.lifecycle?.maintenance?.autoRunOnRecall ?? "(not set)"}`);
    logger.info(`lifecycle.maintenance.debounceMs = ${config.lifecycle?.maintenance?.debounceMs ?? "(not set)"}`);
  });

configCommand
  .command("get")
  .description("Get a configuration value")
  .argument("<key>", "Configuration key (e.g., remote.url, defaults.memoryType)")
  .action((key) => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const value = getConfigValue(config, key);

    if (value === undefined) {
      logger.fatal(`key '${key}' not found`);
      process.exit(EXIT_ERROR);
    }

    if (isJsonMode()) {
      outputJson({ key, value });
      return;
    }

    logger.info(String(value));
  });

const VALID_CONFIG_KEYS = [
  "remote.url",
  "remote.orgId",
  "remote.repoId",
  "defaults.visibility",
  "defaults.memoryType",
  "lifecycle.ttlSecondsByType.episodic",
  "lifecycle.ttlSecondsByType.semantic",
  "lifecycle.ttlSecondsByType.procedural",
  "lifecycle.usageBoost.enabled",
  "lifecycle.usageBoost.topKToRecord",
  "lifecycle.usageBoost.minUsageCount",
  "lifecycle.usageBoost.maxBoost",
  "lifecycle.usageBoost.halfLifeDays",
  "lifecycle.maintenance.staleEpisodicDays",
  "lifecycle.maintenance.consolidationThreshold",
  "lifecycle.maintenance.consolidationMinGroupSize",
  "lifecycle.maintenance.consolidationMaxGroups",
  "lifecycle.maintenance.promoteRecallCount",
  "lifecycle.maintenance.pinRecallCount",
  "lifecycle.maintenance.dryRunDefault",
  "lifecycle.maintenance.autoRunOnStore",
  "lifecycle.maintenance.autoRunOnRecall",
  "lifecycle.maintenance.debounceMs",
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
  unforgit config set remote.url http://my-server:3737
  unforgit config set defaults.memoryType semantic`)
  .action((key, value) => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
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

    logger.info(`${key} = ${value}`);
  });

configCommand
  .command("unset")
  .description("Remove a configuration value")
  .argument("<key>", "Configuration key to remove")
  .action((key) => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    unsetConfigValue(config, key);
    saveConfig(config);

    logger.info(`Unset ${key}`);
  });

function getConfigValue(config: AppConfig, key: string): unknown {
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

function setConfigValue(config: AppConfig, key: string, value: string): void {
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

  current[parts[parts.length - 1]] = coerceConfigValue(value);
}

function unsetConfigValue(config: AppConfig, key: string): void {
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

function coerceConfigValue(value: string): string | number | boolean {
  if (value === "true") return true;
  if (value === "false") return false;

  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value;
}
