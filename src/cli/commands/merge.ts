import { Command } from "commander";
import { LocalStore } from "../../db/local.js";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import type { MemoryType } from "../../core/types.js";

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
      console.error(
        "Error: Hippocampus not initialized. Run 'hippo init' first.",
      );
      process.exit(1);
    }

    if (ids.length < 2) {
      console.error("Error: At least 2 memory IDs are required for merge.");
      process.exit(1);
    }

    const config = loadConfig(cwd);
    const store = new LocalStore(getDbPath(cwd));

    try {
      const result = store.consolidateMemories({
        orgId: config.remote.orgId || "local",
        repoId: config.remote.repoId || "local",
        sourceIds: ids,
        consolidatedText: opts.text,
        memoryType: opts.type as MemoryType | undefined,
        tags: opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : undefined,
        preserveOriginals: opts.supersede !== false,
      });

      console.log("Merge complete!");
      console.log(`  Consolidated ID: ${result.consolidatedId}`);
      console.log(`  Version: ${result.version}`);
      console.log(`  Sources preserved: ${result.sourcesPreserved}`);
      console.log(
        `  Source IDs: ${result.sourceIds.map((id) => id.slice(0, 8)).join(", ")}`,
      );
      console.log();
      console.log(
        "Original memories are linked via 'derived_from' and marked as 'superseded'.",
      );
      console.log("Use 'hippo history <id>' to view the consolidation history.");
    } catch (err) {
      console.error(
        `Error merging memories: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(1);
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
      console.error(
        "Error: Hippocampus not initialized. Run 'hippo init' first.",
      );
      process.exit(1);
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

      console.log("Remerge complete!");
      console.log(`  New consolidated ID: ${result.consolidatedId}`);
      console.log(`  New version: ${result.version}`);
      console.log(`  Total sources: ${result.sourcesPreserved}`);
      console.log(
        `  Previous consolidation: ${consolidationId.slice(0, 8)} (now superseded)`,
      );
      console.log();
      console.log("Use 'hippo history <id>' to view all versions.");
    } catch (err) {
      console.error(
        `Error remerging: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(1);
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
  .action(async (memoryId: string, opts) => {
    if (!isInitialized(cwd)) {
      console.error(
        "Error: Hippocampus not initialized. Run 'hippo init' first.",
      );
      process.exit(1);
    }

    const config = loadConfig(cwd);
    const store = new LocalStore(getDbPath(cwd));

    try {
      const similar = store.findSimilar({
        orgId: config.remote.orgId || "local",
        repoId: config.remote.repoId || "local",
        memoryId,
        threshold: parseFloat(opts.threshold),
        k: parseInt(opts.limit, 10),
      });

      if (similar.length === 0) {
        console.log("No similar memories found.");
        return;
      }

      console.log(`Found ${similar.length} similar memories:\n`);

      for (const mem of similar) {
        console.log(
          `[${mem.memoryType}] ${mem.id.slice(0, 8)} (score: ${mem.score.toFixed(3)})`,
        );
        console.log(`  ${mem.text.slice(0, 100)}${mem.text.length > 100 ? "..." : ""}`);
        if (mem.tags.length > 0) {
          console.log(`  Tags: ${mem.tags.join(", ")}`);
        }
        console.log();
      }

      console.log("Tip: Use 'hippo merge <id1> <id2> ... -t \"merged text\"' to consolidate.");
    } catch (err) {
      console.error(
        `Error finding similar: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(1);
    } finally {
      store.close();
    }
  });

export const historyCommand = new Command("history")
  .description("Show consolidation history for a memory")
  .argument("<memory-id>", "Memory ID to show history for")
  .action(async (memoryId: string) => {
    if (!isInitialized(cwd)) {
      console.error(
        "Error: Hippocampus not initialized. Run 'hippo init' first.",
      );
      process.exit(1);
    }

    const store = new LocalStore(getDbPath(cwd));

    try {
      const memory = store.getById(memoryId);
      if (!memory) {
        console.error("Memory not found.");
        process.exit(1);
      }

      console.log(`Memory: ${memory.id.slice(0, 8)}`);
      console.log(`Type: ${memory.memoryType}`);
      console.log(`Status: ${memory.status}`);
      console.log(`Is Consolidation: ${memory.isConsolidation ? "Yes" : "No"}`);

      if (memory.isConsolidation) {
        console.log(`Version: ${memory.consolidationVersion ?? 1}`);
        console.log(`Text: ${memory.text}`);

        const sources = store.getConsolidatedSources(memoryId);
        if (sources.length > 0) {
          console.log("\nSource memories:");
          for (const src of sources) {
            console.log(
              `  └─ [${src.memoryType}] ${src.id.slice(0, 8)}: ${src.text.slice(0, 60)}...`,
            );
          }
        }

        const history = store.getConsolidationHistory(memoryId);
        const previousVersions = history.filter((h) => h.isConsolidation);
        if (previousVersions.length > 0) {
          console.log("\nPrevious consolidation versions:");
          for (const prev of previousVersions) {
            console.log(
              `  └─ v${prev.consolidationVersion ?? 1} (${prev.id.slice(0, 8)}): ${prev.text.slice(0, 60)}...`,
            );
          }
        }
      } else {
        console.log(`Text: ${memory.text}`);

        const links = store.getLinks({ memoryId, linkType: "derived_from" });
        const consolidations = links.filter((l) => l.targetId === memoryId);
        if (consolidations.length > 0) {
          console.log("\nIncluded in consolidations:");
          for (const link of consolidations) {
            const consol = store.getById(link.sourceId);
            if (consol) {
              console.log(
                `  └─ v${consol.consolidationVersion ?? 1} (${consol.id.slice(0, 8)}): ${consol.text.slice(0, 60)}...`,
              );
            }
          }
        }
      }
    } catch (err) {
      console.error(
        `Error fetching history: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(1);
    } finally {
      store.close();
    }
  });
