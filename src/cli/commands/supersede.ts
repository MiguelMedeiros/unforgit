import { Command } from "commander";
import { loadConfig, getDbPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";
import { logger } from "../logger.js";
import { EXIT_ERROR } from "../exit-codes.js";

export const supersedeCommand = new Command("supersede")
  .description("Mark a memory as superseded by another")
  .argument("<old-id>", "Memory ID being superseded")
  .requiredOption("--with <new-id>", "ID of the new memory that replaces it")
  .option("--remote", "Supersede on remote")
  .action(async (oldId, opts) => {
    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url, config.remote.apiKey);

      try {
        await client.supersede(oldId, opts.with);
        logger.info(
          `Superseded remote memory ${oldId.slice(0, 8)}... with ${opts.with.slice(0, 8)}...`,
        );
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
      const ok = store.supersede(oldId, opts.with);

      if (!ok) {
        logger.error(`Memory ${oldId} not found.`);
        process.exit(EXIT_ERROR);
      }

      logger.info(
        `Superseded local memory ${oldId.slice(0, 8)}... with ${opts.with.slice(0, 8)}...`,
      );
    } finally {
      store.close();
    }
  });
