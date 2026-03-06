import { Command } from "commander";
import { loadConfig, getDbPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";
import { logger } from "../logger.js";
import { EXIT_ERROR } from "../exit-codes.js";

export const deleteCommand = new Command("delete")
  .description("Soft delete a memory (can be restored)")
  .argument("<id>", "Memory ID to delete")
  .option("--hard", "Permanently delete (cannot be restored)")
  .option("--remote", "Delete on remote")
  .option("--by <author>", "Author of the deletion")
  .action(async (id, opts) => {
    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url, config.remote.apiKey);

      try {
        await client.delete(id, opts.by, opts.hard);
        const action = opts.hard ? "Hard deleted" : "Soft deleted";
        logger.info(`${action} remote memory ${id.slice(0, 8)}...`);
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
      let ok: boolean;
      if (opts.hard) {
        ok = store.hardDelete(id);
      } else {
        ok = store.softDelete({ id, deletedBy: opts.by });
      }

      if (!ok) {
        logger.error(`Memory ${id} not found.`);
        process.exit(EXIT_ERROR);
      }

      const action = opts.hard ? "Hard deleted" : "Soft deleted";
      logger.info(`${action} local memory ${id.slice(0, 8)}...`);
      if (!opts.hard) {
        logger.info("  This memory can be restored with 'hippo restore'.");
      }
    } finally {
      store.close();
    }
  });

export const restoreCommand = new Command("restore")
  .description("Restore a soft-deleted memory")
  .argument("<id>", "Memory ID to restore")
  .option("--remote", "Restore on remote")
  .action(async (id, opts) => {
    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url, config.remote.apiKey);

      try {
        await client.restore(id);
        logger.info(`Restored remote memory ${id.slice(0, 8)}...`);
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
      const ok = store.restore(id);

      if (!ok) {
        logger.error(`Memory ${id} not found or not deleted.`);
        process.exit(EXIT_ERROR);
      }

      logger.info(`Restored local memory ${id.slice(0, 8)}...`);
    } finally {
      store.close();
    }
  });
