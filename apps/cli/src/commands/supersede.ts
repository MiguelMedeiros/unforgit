import { Command } from "commander";
import { loadConfig, getDbPath } from "@unforgit/config";
import { LocalStore } from "@unforgit/db";
import { RemoteClient } from "@unforgit/config";
import { logger } from "../logger.js";
import { EXIT_ERROR } from "../exit-codes.js";
import { confirm } from "../utils.js";

export const supersedeCommand = new Command("supersede")
  .description("Mark a memory as superseded by another")
  .argument("<old-id>", "Memory ID being superseded")
  .requiredOption("--with <new-id>", "ID of the new memory that replaces it")
  .option("--remote", "Supersede on remote")
  .option("--force", "Skip confirmation")
  .addHelpText("after", `
Examples:
  unforgit supersede abc123 --with def456
  unforgit supersede abc123 --with def456 --remote`)
  .action(async (oldId, opts) => {
    if (oldId === opts.with) {
      logger.error("A memory cannot supersede itself.");
      process.exit(EXIT_ERROR);
    }

    if (!opts.force) {
      const confirmed = await confirm(
        `Supersede memory ${oldId.slice(0, 8)}... with ${opts.with.slice(0, 8)}...?`,
      );
      if (!confirmed) {
        logger.info("Supersede cancelled.");
        return;
      }
    }

    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url);

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
