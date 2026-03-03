import { Command } from "commander";
import { getDbPath, isInitialized } from "../config.js";
import { LocalStore } from "../../db/local.js";

export const unconsolidateCommand = new Command("unconsolidate")
  .description("Revert a consolidation, restoring original memories to active status")
  .argument("<consolidation-id>", "ID of the consolidated memory to revert")
  .option("--dry-run", "Show what would be restored without making changes")
  .action(async (consolidationId: string, opts) => {
    const cwd = process.cwd();

    if (!isInitialized(cwd)) {
      console.error("Error: Hippocampus not initialized. Run 'hippo init' first.");
      process.exit(1);
    }

    const dbPath = getDbPath(cwd);
    const store = new LocalStore(dbPath);

    try {
      const memory = store.getById(consolidationId);
      if (!memory) {
        console.error(`Error: Memory not found: ${consolidationId}`);
        process.exit(1);
      }

      if (!memory.isConsolidation) {
        console.error(`Error: Memory ${consolidationId} is not a consolidation.`);
        console.error("Only consolidated memories can be unconsolidated.");
        process.exit(1);
      }

      const sourceLinks = store.getLinks({ memoryId: consolidationId, linkType: "derived_from" });
      const sourceIds = sourceLinks
        .filter((l) => l.sourceId === consolidationId)
        .map((l) => l.targetId);

      console.log(`Consolidation: ${consolidationId.slice(0, 8)}`);
      console.log(`Version: ${memory.consolidationVersion ?? 1}`);
      console.log(`Source memories: ${sourceIds.length}`);
      console.log("");

      if (sourceIds.length === 0) {
        console.error("No source memories found for this consolidation.");
        process.exit(1);
      }

      console.log("Source memories to restore:");
      for (const sourceId of sourceIds) {
        const source = store.getById(sourceId);
        if (source) {
          const status = source.status === "superseded" ? "will restore" : `${source.status} (no change)`;
          const preview = source.text.slice(0, 60) + (source.text.length > 60 ? "..." : "");
          console.log(`  - ${sourceId.slice(0, 8)} [${source.memoryType}] (${status})`);
          console.log(`    ${preview}`);
        }
      }
      console.log("");

      if (opts.dryRun) {
        console.log("[Dry run - no changes made]");
        console.log("Run without --dry-run to execute the unconsolidation.");
        return;
      }

      const result = store.unconsolidate(consolidationId);

      console.log("Unconsolidation complete:");
      console.log(`  Restored: ${result.restoredIds.length} memories`);
      console.log(`  Links removed: ${result.linksRemoved}`);
      console.log(`  Consolidation deleted: ${result.consolidationDeleted ? "Yes" : "No"}`);

      if (result.restoredIds.length > 0) {
        console.log("\nRestored memories:");
        for (const id of result.restoredIds) {
          console.log(`  - ${id.slice(0, 8)}`);
        }
      }

      console.log("\nThe consolidated memory has been soft-deleted and can be restored with 'hippo restore'.");
    } finally {
      store.close();
    }
  });
