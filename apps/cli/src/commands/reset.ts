import { Command } from "commander";
import { loadConfig, getDbPath } from "unforgit-config";
import { LocalStore } from "unforgit-db";
import { RemoteClient } from "unforgit-config";
import { logger } from "../logger.js";
import { EXIT_ERROR } from "../exit-codes.js";
import { confirm } from "../utils.js";
import { createLocalResetBackup } from "./backups.js";

export { createLocalResetBackup } from "./backups.js";

export const resetCommand = new Command("reset")
  .description("Permanently delete all memories and related data")
  .option("--local", "Reset local store only")
  .option("--remote", "Reset remote store only")
  .option("--force", "Skip confirmation prompt")
  .option("--no-backup", "Skip automatic local database backup before local reset")
  .addHelpText("after", `
Examples:
  unforgit reset                Reset both local and remote
  unforgit reset --local        Reset local store only
  unforgit reset --remote       Reset remote store only
  unforgit reset --force        Skip confirmation
  unforgit reset --no-backup    Skip local backup before reset`)
  .action(async (opts) => {
    const resetLocal = opts.local || (!opts.local && !opts.remote);
    const resetRemote = opts.remote || (!opts.local && !opts.remote);

    const targets = [
      resetLocal ? "local" : null,
      resetRemote ? "remote" : null,
    ].filter(Boolean);

    if (!opts.force) {
      logger.info(
        `WARNING: This will permanently delete ALL memories, links, embeddings, and sync state from: ${targets.join(" + ")}`,
      );
      logger.info("This action CANNOT be undone.");

      const confirmed = await confirm("Type 'yes' to confirm");
      if (!confirmed) {
        logger.info("Reset cancelled.");
        return;
      }
    }

    const config = loadConfig();

    if (resetLocal) {
      const dbPath = getDbPath();
      if (opts.backup !== false) {
        try {
          const backup = createLocalResetBackup(dbPath);
          if (backup) {
            logger.info(`Created local reset backup: ${backup.dir}`);
          }
        } catch (err) {
          logger.error(
            `Failed to create local reset backup: ${err instanceof Error ? err.message : String(err)}`,
          );
          process.exit(EXIT_ERROR);
        }
      }

      const store = new LocalStore(dbPath);
      try {
        const result = store.resetAll();
        logger.info(`Local reset complete:`);
        logger.info(`  Memories deleted: ${result.memoriesDeleted}`);
        logger.info(`  Links deleted: ${result.linksDeleted}`);
        logger.info(`  Embeddings deleted: ${result.embeddingsDeleted}`);
      } finally {
        store.close();
      }
    }

    if (resetRemote) {
      if (!config.remote?.url) {
        if (opts.remote) {
          logger.error("No remote URL configured. Run 'unforgit init' first.");
          process.exit(EXIT_ERROR);
        }
        logger.info("No remote configured, skipping remote reset.");
        return;
      }

      const client = new RemoteClient(config.remote.url);
      const orgId = config.remote.orgId;
      const repoId = config.remote.repoId;

      if (!orgId || !repoId) {
        logger.error("orgId and repoId must be configured for remote reset.");
        process.exit(EXIT_ERROR);
      }

      try {
        const result = await client.resetAll(orgId, repoId);
        logger.info(`Remote reset complete:`);
        logger.info(`  Memories deleted: ${result.memoriesDeleted}`);
        logger.info(`  Links deleted: ${result.linksDeleted}`);
        logger.info(`  Embeddings deleted: ${result.embeddingsDeleted}`);
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exit(EXIT_ERROR);
      }
    }
  });
