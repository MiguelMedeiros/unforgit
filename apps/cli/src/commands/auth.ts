import { Command } from "commander";
import { loadConfig, isInitialized } from "unforgit-config";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { maskKey } from "../utils.js";

export const authCommand = new Command("auth")
  .description("Check authentication status for remote server and APIs");

authCommand
  .command("status")
  .description("Check authentication status")
  .action(async () => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();

    logger.info("Authentication status:");
    logger.info(`  Remote URL: ${config.remote.url || "(not configured)"}`);
    logger.info(`  Org ID: ${config.remote.orgId || "(not configured)"}`);
    logger.info(`  Repo ID: ${config.remote.repoId || "(not configured)"}`);

    const apiKey = process.env.UNFORGIT_API_KEY;

    if (apiKey) {
      logger.info(`  API Key: ${maskKey(apiKey)} (from UNFORGIT_API_KEY env var)`);

      if (config.remote.url) {
        logger.info("\nTesting connection...");
        try {
          const res = await fetch(`${config.remote.url}/health`);
          if (res.ok) {
            logger.info("  [ok] Server reachable");

            const authRes = await fetch(`${config.remote.url}/v1/api-keys`, {
              headers: { Authorization: `Bearer ${apiKey}` },
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
      logger.info("\nSet the UNFORGIT_API_KEY environment variable.");
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      logger.info(`  OpenAI Key: ${maskKey(openaiKey)} (from OPENAI_API_KEY env var)`);
    } else {
      logger.info("  OpenAI Key: (not configured)");
      logger.info("  Set OPENAI_API_KEY env var for embeddings and auto-consolidation.");
    }
  });
