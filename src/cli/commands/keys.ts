import { Command } from "commander";
import { loadConfig, isInitialized } from "../config.js";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR, EXIT_ERROR } from "../exit-codes.js";

export const keysCommand = new Command("keys")
  .description("Manage API keys for remote authentication");

keysCommand
  .command("create")
  .description("Create a new API key")
  .requiredOption("--name <name>", "Name for the API key")
  .requiredOption("--org <orgId>", "Organization ID for the key")
  .action(async (opts) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();

    if (!config.remote.url) {
      logger.fatal("No remote configured.");
      logger.error("Use 'hippo remote add origin <url>' to add a remote.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    if (!config.remote.apiKey) {
      logger.fatal("No API key configured for admin access.");
      logger.error("You need an existing API key to create new ones.");
      logger.error("Configure apiKey in .hippocampus/hippo.yaml first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    try {
      const res = await fetch(`${config.remote.url}/v1/api-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.remote.apiKey}`,
        },
        body: JSON.stringify({ name: opts.name, orgId: opts.org }),
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) {
          logger.fatal("Authentication failed. Check your API key.");
        } else {
          logger.fatal(`Failed to create API key: ${err}`);
        }
        process.exit(EXIT_ERROR);
      }

      const result = await res.json() as { id: string; key: string; name: string; orgId: string };

      logger.info("API key created successfully!");
      logger.info("");
      logger.info(`  ID:    ${result.id}`);
      logger.info(`  Name:  ${result.name}`);
      logger.info(`  Org:   ${result.orgId}`);
      logger.info(`  Key:   ${result.key}`);
      logger.info("");
      logger.info("Store this key securely. It will not be shown again.");
      logger.info("");
      logger.info("To use this key, add it to .hippocampus/hippo.yaml:");
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
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();

    if (!config.remote.url) {
      logger.fatal("No remote configured.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    if (!config.remote.apiKey) {
      logger.fatal("No API key configured.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    try {
      const url = new URL(`${config.remote.url}/v1/api-keys`);
      if (opts.org) url.searchParams.set("orgId", opts.org);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${config.remote.apiKey}`,
        },
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) {
          logger.fatal("Authentication failed. Check your API key.");
        } else {
          logger.fatal(`Failed to list API keys: ${err}`);
        }
        process.exit(EXIT_ERROR);
      }

      const result = await res.json() as {
        keys: Array<{
          id: string;
          name: string;
          orgId: string;
          isActive: boolean;
          createdAt: string;
          lastUsedAt: string | null;
        }>;
      };

      if (result.keys.length === 0) {
        logger.info("No API keys found.");
        return;
      }

      logger.info(`Found ${result.keys.length} API key(s):\n`);

      for (const key of result.keys) {
        const status = key.isActive ? "\x1b[32m●\x1b[0m" : "\x1b[31m○\x1b[0m";
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
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();

    if (!config.remote.url) {
      logger.fatal("No remote configured.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    if (!config.remote.apiKey) {
      logger.fatal("No API key configured.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    try {
      const res = await fetch(`${config.remote.url}/v1/api-keys/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${config.remote.apiKey}`,
        },
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) {
          logger.fatal("Authentication failed. Check your API key.");
        } else if (res.status === 404) {
          logger.fatal(`API key '${id}' not found.`);
        } else {
          logger.fatal(`Failed to revoke API key: ${err}`);
        }
        process.exit(EXIT_ERROR);
      }

      logger.info(`API key ${id.slice(0, 8)}... revoked successfully.`);
    } catch (err) {
      logger.fatal(err instanceof Error ? err.message : String(err));
      process.exit(EXIT_ERROR);
    }
  });
