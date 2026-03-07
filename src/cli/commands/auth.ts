import { Command } from "commander";
import { loadConfig, saveConfig, isInitialized, getConfigPath } from "../config.js";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR } from "../exit-codes.js";
import fs from "node:fs";
import { maskKey } from "../utils.js";

function checkConfigPermissions(): void {
  if (process.platform === "win32") return;
  try {
    const configPath = getConfigPath();
    const stat = fs.statSync(configPath);
    const mode = stat.mode & 0o777;
    if (mode & 0o044) {
      logger.warn(
        `${configPath} is readable by others (mode ${mode.toString(8)}). ` +
        `Consider running: chmod 600 ${configPath}`,
      );
    }
  } catch {
    // file might not exist yet
  }
}

export const authCommand = new Command("auth")
  .description("Configure authentication for remote server and APIs");

authCommand
  .command("set")
  .description("Set the API key for remote authentication")
  .argument("<api-key>", "API key to use for authentication")
  .addHelpText("after", `
Examples:
  hippo auth set hk_abc123def456
  hippo auth status`)
  .action(async (apiKey) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      logger.error("Run 'hippo init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    if (!apiKey.startsWith("hk_")) {
      logger.warn("API key should start with 'hk_'");
    }

    const config = loadConfig();
    config.remote.apiKey = apiKey;
    saveConfig(config);

    checkConfigPermissions();
    logger.info("API key configured successfully!");
    logger.info(`  Remote: ${config.remote.url}`);
    logger.info(`  Key: ${maskKey(apiKey)}`);
  });

authCommand
  .command("status")
  .description("Check authentication status")
  .action(async () => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();

    logger.info("Authentication status:");
    logger.info(`  Remote URL: ${config.remote.url || "(not configured)"}`);
    logger.info(`  Org ID: ${config.remote.orgId || "(not configured)"}`);
    logger.info(`  Repo ID: ${config.remote.repoId || "(not configured)"}`);

    const effectiveApiKey = config.remote.apiKey || process.env.HIPPO_API_KEY;

    if (effectiveApiKey) {
      const source = config.remote.apiKey ? "config" : "env (HIPPO_API_KEY)";
      logger.info(`  API Key: ${maskKey(effectiveApiKey)} (from ${source})`);

      if (config.remote.url) {
        logger.info("\nTesting connection...");
        try {
          const res = await fetch(`${config.remote.url}/health`);
          if (res.ok) {
            logger.info("  [ok] Server reachable");

            const authRes = await fetch(`${config.remote.url}/v1/api-keys`, {
              headers: { Authorization: `Bearer ${effectiveApiKey}` },
            });
            if (authRes.ok) {
              logger.info("  [ok] API key valid");
            } else if (authRes.status === 401) {
              logger.info("  [ERR] API key invalid or expired");
            } else {
              logger.info(`  [??] Could not verify API key (HTTP ${authRes.status})`);
            }
          } else {
            logger.info(`  [ERR] Server returned HTTP ${res.status}`);
          }
        } catch (err) {
          logger.info(`  [ERR] Could not connect: ${err instanceof Error ? err.message : err}`);
        }
      }
    } else {
      logger.info("  API Key: (not configured)");
      logger.info("\nRun 'hippo auth set <api-key>' or set HIPPO_API_KEY env var.");
    }

    checkConfigPermissions();
  });

authCommand
  .command("remove")
  .description("Remove the configured API key")
  .action(async () => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();

    if (!config.remote.apiKey) {
      logger.info("No API key configured.");
      return;
    }

    delete config.remote.apiKey;
    saveConfig(config);

    logger.info("API key removed.");
  });

authCommand
  .command("openai")
  .description("Set OpenAI API key for auto-consolidation and embeddings")
  .argument("<api-key>", "OpenAI API key (starts with sk-)")
  .action((apiKey) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    if (!apiKey.startsWith("sk-")) {
      logger.warn("OpenAI API key should start with 'sk-'");
    }

    const config = loadConfig();
    config.openaiApiKey = apiKey;
    saveConfig(config);

    checkConfigPermissions();
    logger.info("OpenAI API key configured successfully!");
    logger.info(`  Key: ${maskKey(apiKey)}`);
    logger.info("\nYou can now use 'hippo auto-consolidate' and 'hippo embeddings backfill'.");
  });

authCommand
  .command("openai-remove")
  .description("Remove the OpenAI API key")
  .action(() => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();

    if (!config.openaiApiKey) {
      logger.info("No OpenAI API key configured.");
      return;
    }

    delete config.openaiApiKey;
    saveConfig(config);

    logger.info("OpenAI API key removed.");
  });
