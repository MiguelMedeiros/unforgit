import { Command } from "commander";
import { getDbPath, isInitialized } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { confirm } from "../utils.js";

export const unconsolidateCommand = new Command("unconsolidate")
  .description("Revert a consolidation, restoring original memories to active status")
  .argument("<consolidation-id>", "ID of the consolidated memory to revert")
  .option("--dry-run", "Show what would be restored without making changes")
  .option("--force", "Skip confirmation")
  .addHelpText("after", `
Examples:
  hippo unconsolidate abc123 --dry-run   Preview what would be restored
  hippo unconsolidate abc123             Revert a consolidation`)
  .action(async (consolidationId: string, opts) => {
    const cwd = process.cwd();

    if (!isInitialized(cwd)) {
      logger.error("Hippocampus not initialized. Run 'hippo init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const dbPath = getDbPath(cwd);
    const store = new LocalStore(dbPath);

    try {
      const memory = store.getById(consolidationId);
      if (!memory) {
        logger.error(`Memory not found: ${consolidationId}`);
        process.exit(EXIT_ERROR);
      }

      if (!memory.isConsolidation) {
        logger.error(`Memory ${consolidationId} is not a consolidation.`);
        logger.error("Only consolidated memories can be unconsolidated.");
        process.exit(EXIT_ERROR);
      }

      const sourceLinks = store.getLinks({ memoryId: consolidationId, linkType: "derived_from" });
      const sourceIds = sourceLinks
        .filter((l) => l.sourceId === consolidationId)
        .map((l) => l.targetId);

      logger.info(`Consolidation: ${consolidationId.slice(0, 8)}`);
      logger.info(`Version: ${memory.consolidationVersion ?? 1}`);
      logger.info(`Source memories: ${sourceIds.length}`);

      if (sourceIds.length === 0) {
        logger.error("No source memories found for this consolidation.");
        process.exit(EXIT_ERROR);
      }

      logger.info("Source memories to restore:");
      for (const sourceId of sourceIds) {
        const source = store.getById(sourceId);
        if (source) {
          const status = source.status === "superseded" ? "will restore" : `${source.status} (no change)`;
          const preview = source.text.slice(0, 60) + (source.text.length > 60 ? "..." : "");
          logger.info(`  - ${sourceId.slice(0, 8)} [${source.memoryType}] (${status})`);
          logger.info(`    ${preview}`);
        }
      }
      logger.info("");

      if (opts.dryRun) {
        logger.info("[Dry run - no changes made]");
        logger.info("Run without --dry-run to execute the unconsolidation.");
        return;
      }

      if (!opts.force) {
        const confirmed = await confirm(
          `Revert consolidation ${consolidationId.slice(0, 8)}... and restore ${sourceIds.length} source memories?`,
        );
        if (!confirmed) {
          logger.info("Unconsolidation cancelled.");
          return;
        }
      }

      const result = store.unconsolidate(consolidationId);

      logger.info("Unconsolidation complete:");
      logger.info(`  Restored: ${result.restoredIds.length} memories`);
      logger.info(`  Links removed: ${result.linksRemoved}`);
      logger.info(`  Consolidation deleted: ${result.consolidationDeleted ? "Yes" : "No"}`);

      if (result.restoredIds.length > 0) {
        logger.info("\nRestored memories:");
        for (const id of result.restoredIds) {
          logger.info(`  - ${id.slice(0, 8)}`);
        }
      }

      logger.info("\nThe consolidated memory has been soft-deleted and can be restored with 'hippo restore'.");
    } finally {
      store.close();
    }
  });
