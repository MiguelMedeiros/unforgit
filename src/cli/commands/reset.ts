import { Command } from "commander";
import { loadConfig, getDbPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";
import { logger } from "../logger.js";
import { EXIT_ERROR } from "../exit-codes.js";
import { confirm } from "../utils.js";

export const resetCommand = new Command("reset")
  .description("Permanently delete all memories and related data")
  .option("--local", "Reset local store only")
  .option("--remote", "Reset remote store only")
  .option("--force", "Skip confirmation prompt")
  .addHelpText("after", `
Examples:
  hippo reset                Reset both local and remote
  hippo reset --local        Reset local store only
  hippo reset --remote       Reset remote store only
  hippo reset --force        Skip confirmation`)
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
      const store = new LocalStore(getDbPath());
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
          logger.error("No remote URL configured. Run 'hippo init' first.");
          process.exit(EXIT_ERROR);
        }
        logger.info("No remote configured, skipping remote reset.");
        return;
      }

      const client = new RemoteClient(config.remote.url, config.remote.apiKey);
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
