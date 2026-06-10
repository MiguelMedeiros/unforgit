import { Command } from "commander";
import { LocalStore } from "unforgit-db";
import { loadConfig, getDbPath, isInitialized } from "unforgit-config";
import type { MemoryType } from "unforgit-shared";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";
import {
  parseThreshold,
  parsePositiveInt,
  validateMemoryType,
} from "unforgit-config";
import { isJsonMode, outputJson } from "../utils.js";

const cwd = process.cwd();

export const mergeCommand = new Command("merge")
  .description(
    "Consolidate multiple local memories into one unified memory while preserving history",
  )
  .argument("<ids...>", "Memory IDs to consolidate (minimum 2)")
  .requiredOption(
    "-t, --text <text>",
    "Consolidated text combining insights from source memories",
  )
  .option(
    "--type <type>",
    "Memory type for consolidated memory (episodic, semantic, procedural)",
  )
  .option("--tags <tags>", "Comma-separated tags for the consolidated memory")
  .option(
    "--no-supersede",
    "Do not mark original memories as superseded",
  )
  .action(async (ids: string[], opts) => {
    if (!isInitialized(cwd)) {
      logger.error("Unforgit not initialized. Run 'unforgit init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    if (ids.length < 2) {
      logger.error("At least 2 memory IDs are required for merge.");
      process.exit(EXIT_ERROR);
    }

    if (opts.type && !validateMemoryType(opts.type)) {
      logger.error("--type must be one of: episodic, semantic, procedural");
      process.exit(EXIT_ERROR);
    }

    const config = loadConfig(cwd);
    const store = new LocalStore(getDbPath(cwd));

    try {
      for (const id of ids) {
        const mem = store.getById(id);
        if (!mem) {
          logger.error(`Memory ${id} not found.`);
          process.exit(EXIT_ERROR);
        }
        if (mem.status === "deleted") {
          logger.error(`Memory ${id.slice(0, 8)} is deleted. Restore it before merging.`);
          process.exit(EXIT_ERROR);
        }
        if (mem.status === "superseded") {
          logger.error(`Memory ${id.slice(0, 8)} is already superseded. Cannot merge superseded memories.`);
          process.exit(EXIT_ERROR);
        }
      }

      const result = store.consolidateMemories({
        orgId: config.remote.orgId || "local",
        repoId: config.remote.repoId || "local",
        sourceIds: ids,
        consolidatedText: opts.text,
        memoryType: opts.type as MemoryType | undefined,
        tags: opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : undefined,
        preserveOriginals: opts.supersede !== false,
      });

      logger.info("Merge complete!");
      logger.info(`  Consolidated ID: ${result.consolidatedId}`);
      logger.info(`  Version: ${result.version}`);
      logger.info(`  Sources preserved: ${result.sourcesPreserved}`);
      logger.info(
        `  Source IDs: ${result.sourceIds.map((id) => id.slice(0, 8)).join(", ")}`,
      );
      logger.info("");
      logger.info(
        "Original memories are linked via 'derived_from' and marked as 'superseded'.",
      );
      logger.info("Use 'unforgit history <id>' to view the consolidation history.");
    } catch (err) {
      logger.error(
        `Merging memories: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(EXIT_ERROR);
    } finally {
      store.close();
    }
  });

export const remergeCommand = new Command("remerge")
  .description(
    "Update an existing consolidation with new information or additional sources",
  )
  .argument("<consolidation-id>", "ID of existing consolidated memory to update")
  .requiredOption("-t, --text <text>", "Updated consolidated text")
  .option(
    "--add <ids>",
    "Comma-separated IDs of additional memories to include",
  )
  .option("--tags <tags>", "Comma-separated tags (keeps existing if not provided)")
  .action(async (consolidationId: string, opts) => {
    if (!isInitialized(cwd)) {
      logger.error("Unforgit not initialized. Run 'unforgit init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig(cwd);
    const store = new LocalStore(getDbPath(cwd));

    try {
      const result = store.reconsolidate({
        orgId: config.remote.orgId || "local",
        repoId: config.remote.repoId || "local",
        existingConsolidationId: consolidationId,
        additionalSourceIds: opts.add
          ? opts.add.split(",").map((t: string) => t.trim())
          : undefined,
        newText: opts.text,
        tags: opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : undefined,
      });

      logger.info("Remerge complete!");
      logger.info(`  New consolidated ID: ${result.consolidatedId}`);
      logger.info(`  New version: ${result.version}`);
      logger.info(`  Total sources: ${result.sourcesPreserved}`);
      logger.info(
        `  Previous consolidation: ${consolidationId.slice(0, 8)} (now superseded)`,
      );
      logger.info("");
      logger.info("Use 'unforgit history <id>' to view all versions.");
    } catch (err) {
      logger.error(
        `Remerging: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(EXIT_ERROR);
    } finally {
      store.close();
    }
  });

export const similarCommand = new Command("similar")
  .description("Find memories similar to a given memory (candidates for merging)")
  .argument("<memory-id>", "Memory ID to find similar ones for")
  .option(
    "-k, --limit <n>",
    "Max number of similar memories to return",
    "10",
  )
  .option(
    "--threshold <score>",
    "Minimum similarity score (0-1)",
    "0.3",
  )
  .addHelpText("after", `
Examples:
  unforgit similar abc123
  unforgit similar abc123 --threshold 0.5 -k 5`)
  .action(async (memoryId: string, opts) => {
    if (!isInitialized(cwd)) {
      logger.error("Unforgit not initialized. Run 'unforgit init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig(cwd);
    const store = new LocalStore(getDbPath(cwd));

    try {
      const similar = store.findSimilar({
        orgId: config.remote.orgId || "local",
        repoId: config.remote.repoId || "local",
        memoryId,
        threshold: parseThreshold(opts.threshold),
        k: parsePositiveInt(opts.limit, "limit"),
      });

      if (isJsonMode()) {
        outputJson({
          results: similar.map((m) => ({
            id: m.id,
            type: m.memoryType,
            score: m.score,
            text: m.text,
            tags: m.tags,
          })),
        });
        return;
      }

      if (similar.length === 0) {
        logger.info("No similar memories found.");
        return;
      }

      logger.info(`Found ${similar.length} similar memories:\n`);

      for (const mem of similar) {
        logger.info(
          `[${mem.memoryType}] ${mem.id.slice(0, 8)} (score: ${mem.score.toFixed(3)})`,
        );
        logger.info(`  ${mem.text.slice(0, 100)}${mem.text.length > 100 ? "..." : ""}`);
        if (mem.tags.length > 0) {
          logger.info(`  Tags: ${mem.tags.join(", ")}`);
        }
        logger.info("");
      }

      logger.info("Tip: Use 'unforgit merge <id1> <id2> ... -t \"merged text\"' to consolidate.");
    } catch (err) {
      logger.error(
        `Finding similar: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(EXIT_ERROR);
    } finally {
      store.close();
    }
  });

export const historyCommand = new Command("history")
  .description("Show consolidation history for a memory")
  .argument("<memory-id>", "Memory ID to show history for")
  .action(async (memoryId: string) => {
    if (!isInitialized(cwd)) {
      logger.error("Unforgit not initialized. Run 'unforgit init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const store = new LocalStore(getDbPath(cwd));

    try {
      const memory = store.getById(memoryId);
      if (!memory) {
        logger.error("Memory not found.");
        process.exit(EXIT_ERROR);
      }

      logger.info(`Memory: ${memory.id.slice(0, 8)}`);
      logger.info(`Type: ${memory.memoryType}`);
      logger.info(`Status: ${memory.status}`);
      logger.info(`Is Consolidation: ${memory.isConsolidation ? "Yes" : "No"}`);

      if (memory.isConsolidation) {
        logger.info(`Version: ${memory.consolidationVersion ?? 1}`);
        logger.info(`Text: ${memory.text}`);

        const sources = store.getConsolidatedSources(memoryId);
        if (sources.length > 0) {
          logger.info("\nSource memories:");
          for (const src of sources) {
            logger.info(
              `  └─ [${src.memoryType}] ${src.id.slice(0, 8)}: ${src.text.slice(0, 60)}...`,
            );
          }
        }

        const history = store.getConsolidationHistory(memoryId);
        const previousVersions = history.filter((h) => h.isConsolidation);
        if (previousVersions.length > 0) {
          logger.info("\nPrevious consolidation versions:");
          for (const prev of previousVersions) {
            logger.info(
              `  └─ v${prev.consolidationVersion ?? 1} (${prev.id.slice(0, 8)}): ${prev.text.slice(0, 60)}...`,
            );
          }
        }
      } else {
        logger.info(`Text: ${memory.text}`);

        const links = store.getLinks({ memoryId, linkType: "derived_from" });
        const consolidations = links.filter((l) => l.targetId === memoryId);
        if (consolidations.length > 0) {
          logger.info("\nIncluded in consolidations:");
          for (const link of consolidations) {
            const consol = store.getById(link.sourceId);
            if (consol) {
              logger.info(
                `  └─ v${consol.consolidationVersion ?? 1} (${consol.id.slice(0, 8)}): ${consol.text.slice(0, 60)}...`,
              );
            }
          }
        }
      }
    } catch (err) {
      logger.error(
        `Fetching history: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(EXIT_ERROR);
    } finally {
      store.close();
    }
  });
