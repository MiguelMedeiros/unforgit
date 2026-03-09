import { Command } from "commander";
import { loadConfig, isInitialized } from "../config.js";
import { RemoteClient } from "../remote-client.js";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR, EXIT_ERROR } from "../exit-codes.js";
import { isJsonMode, outputJson } from "../utils.js";

function requireRemote(): { url: string; apiKey: string } {
  if (!isInitialized()) {
    logger.fatal("not an unforgit repository");
    process.exit(EXIT_CONFIG_ERROR);
  }

  const config = loadConfig();

  if (!config.remote.url) {
    logger.fatal("No remote configured.");
    logger.error("Use 'unforgit remote add origin <url>' to add a remote.");
    process.exit(EXIT_CONFIG_ERROR);
  }

  const apiKey = config.remote.apiKey || process.env.UNFORGIT_API_KEY;
  if (!apiKey) {
    logger.fatal("No API key configured.");
    logger.error("Run 'unforgit auth set <key>' or set UNFORGIT_API_KEY env var.");
    process.exit(EXIT_CONFIG_ERROR);
  }

  return { url: config.remote.url, apiKey };
}

export const keysCommand = new Command("keys")
  .description("Manage API keys for remote authentication");

keysCommand
  .command("create")
  .description("Create a new API key")
  .requiredOption("--name <name>", "Name for the API key")
  .requiredOption("--org <orgId>", "Organization ID for the key")
  .addHelpText("after", `
Examples:
  unforgit keys create --name "CI pipeline" --org my-org
  unforgit keys list --org my-org`)
  .action(async (opts) => {
    const { url, apiKey } = requireRemote();
    const client = new RemoteClient(url, apiKey);

    try {
      const result = await client.createApiKey(opts.name, opts.org);

      if (isJsonMode()) {
        outputJson(result);
        return;
      }

      logger.info("API key created successfully!");
      logger.info("");
      logger.info(`  ID:    ${result.id}`);
      logger.info(`  Name:  ${result.name}`);
      logger.info(`  Org:   ${result.orgId}`);
      logger.info(`  Key:   ${result.key}`);
      logger.info("");
      logger.info("Store this key securely. It will not be shown again.");
      logger.info("");
      logger.info("To use this key, add it to .unforgit/unforgit.yaml:");
      logger.info("");
      logger.info("  remote:");
      logger.info(`    apiKey: "${result.key}"`);
    } catch (err) {
      logger.fatal(err instanceof Error ? err.message : String(err));
      process.exit(EXIT_ERROR);
    }
  });

keysCommand
  .command("list")
  .description("List all API keys")
  .option("--org <orgId>", "Filter by organization ID")
  .action(async (opts) => {
    const { url, apiKey } = requireRemote();
    const client = new RemoteClient(url, apiKey);

    try {
      const result = await client.listApiKeys(opts.org);

      if (isJsonMode()) {
        outputJson(result);
        return;
      }

      if (result.keys.length === 0) {
        logger.info("No API keys found.");
        return;
      }

      logger.info(`Found ${result.keys.length} API key(s):\n`);

      for (const key of result.keys) {
        const status = key.isActive ? "[active]" : "[revoked]";
        const lastUsed = key.lastUsedAt
          ? `last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
          : "never used";
        logger.info(`${status} ${key.id.slice(0, 8)}  ${key.name}`);
        logger.info(`    org: ${key.orgId}  |  ${lastUsed}`);
      }
    } catch (err) {
      logger.fatal(err instanceof Error ? err.message : String(err));
      process.exit(EXIT_ERROR);
    }
  });

keysCommand
  .command("revoke")
  .description("Revoke an API key")
  .argument("<id>", "API key ID to revoke")
  .action(async (id) => {
    const { url, apiKey } = requireRemote();
    const client = new RemoteClient(url, apiKey);

    try {
      await client.revokeApiKey(id);
      logger.info(`API key ${id.slice(0, 8)}... revoked successfully.`);
    } catch (err) {
      logger.fatal(err instanceof Error ? err.message : String(err));
      process.exit(EXIT_ERROR);
    }
  });
