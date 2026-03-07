import { Command } from "commander";
import { loadConfig, getDbPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";
import { logger } from "../logger.js";
import { EXIT_ERROR } from "../exit-codes.js";

export const deprecateCommand = new Command("deprecate")
  .description("Mark a memory as deprecated")
  .argument("<id>", "Memory ID to deprecate")
  .option("--reason <reason>", "Reason for deprecation")
  .option("--remote", "Deprecate on remote")
  .addHelpText("after", `
Examples:
  hippo deprecate abc123 --reason "No longer relevant"
  hippo deprecate abc123 --remote`)
  .action(async (id, opts) => {
    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url, config.remote.apiKey);

      try {
        await client.deprecate(id, opts.reason);
        logger.info(`Deprecated remote memory ${id.slice(0, 8)}...`);
        if (opts.reason) logger.info(`  Reason: ${opts.reason}`);
      } catch (err) {
        logger.error(
          err instanceof Error ? err.message : String(err),
        );
        process.exit(EXIT_ERROR);
      }
      return;
    }

    const store = new LocalStore(getDbPath());

    try {
      const memory = store.getById(id);
      if (!memory) {
        logger.error(`Memory ${id} not found.`);
        process.exit(EXIT_ERROR);
      }

      if (memory.status === "deprecated") {
        logger.warn(`Memory ${id.slice(0, 8)} is already deprecated.`);
        return;
      }

      const ok = store.deprecate(id, opts.reason);

      if (!ok) {
        logger.error(`Memory ${id} not found.`);
        process.exit(EXIT_ERROR);
      }

      logger.info(`Deprecated local memory ${id.slice(0, 8)}...`);
      if (opts.reason) logger.info(`  Reason: ${opts.reason}`);
    } finally {
      store.close();
    }
  });
