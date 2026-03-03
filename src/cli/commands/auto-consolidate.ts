import { Command } from "commander";
import { LocalStore } from "../../db/local.js";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import type { MemoryType } from "../../core/types.js";
import {
  findConsolidationCandidates,
  executeConsolidation,
  formatCandidatePreview,
  type ConsolidationCandidate,
} from "../../core/auto-consolidate.js";
import * as readline from "readline";

const cwd = process.cwd();

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function askConfirmation(
  rl: readline.Interface,
  question: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

export const autoConsolidateCommand = new Command("auto-consolidate")
  .description(
    "Automatically find and consolidate similar memories using AI",
  )
  .option(
    "--threshold <score>",
    "Minimum similarity score (0-1)",
    "0.4",
  )
  .option(
    "--min-group <n>",
    "Minimum group size for consolidation",
    "2",
  )
  .option(
    "--max-groups <n>",
    "Maximum number of groups to process",
    "10",
  )
  .option(
    "--type <type>",
    "Filter by memory type (episodic, semantic, procedural)",
  )
  .option(
    "--dry-run",
    "Show preview without consolidating",
  )
  .option(
    "-y, --yes",
    "Skip confirmation prompts",
  )
  .option(
    "--model <model>",
    "OpenAI model to use",
    "gpt-4o-mini",
  )
  .option(
    "--no-preserve",
    "Do not preserve original memories (hard delete)",
  )
  .action(async (opts) => {
    if (!isInitialized(cwd)) {
      console.error(
        "Error: Hippocampus not initialized. Run 'hippo init' first.",
      );
      process.exit(1);
    }

    const config = loadConfig(cwd);
    const store = new LocalStore(getDbPath(cwd));

    const orgId = config.remote.orgId || "local";
    const repoId = config.remote.repoId || "local";

    const threshold = parseFloat(opts.threshold);
    const minGroupSize = parseInt(opts.minGroup, 10);
    const maxGroups = parseInt(opts.maxGroups, 10);
    const types = opts.type ? [opts.type as MemoryType] : undefined;

    try {
      console.log("Scanning memories for consolidation candidates...\n");

      const result = findConsolidationCandidates(store, orgId, repoId, {
        threshold,
        minGroupSize,
        maxGroups,
        types,
        excludeConsolidations: true,
      });

      console.log(`Scanned ${result.totalMemoriesScanned} active memories`);
      console.log(`Found ${result.totalCandidateGroups} potential groups`);
      console.log(`Showing top ${result.candidates.length} candidates\n`);

      if (result.candidates.length === 0) {
        console.log("No consolidation candidates found.");
        console.log(
          "Try lowering the threshold (--threshold 0.3) or the minimum group size (--min-group 2).",
        );
        return;
      }

      for (let i = 0; i < result.candidates.length; i++) {
        const candidate = result.candidates[i];
        console.log(`\n${"=".repeat(60)}`);
        console.log(`Candidate ${i + 1}/${result.candidates.length}`);
        console.log("=".repeat(60));
        console.log(formatCandidatePreview(candidate));
      }

      if (opts.dryRun) {
        console.log("\n[Dry run mode - no changes made]");
        console.log(
          "Remove --dry-run flag to consolidate these memories.",
        );
        return;
      }

      if (!process.env.OPENAI_API_KEY) {
        console.error(
          "\nError: OPENAI_API_KEY environment variable not set.",
        );
        console.error(
          "Set it in your environment or .env file to enable auto-consolidation.",
        );
        process.exit(1);
      }

      const rl = createReadlineInterface();
      let consolidatedCount = 0;
      let skippedCount = 0;

      try {
        for (let i = 0; i < result.candidates.length; i++) {
          const candidate = result.candidates[i];

          if (!opts.yes) {
            console.log(`\n${"─".repeat(60)}`);
            console.log(`Processing candidate ${i + 1}/${result.candidates.length}`);
            console.log(formatCandidatePreview(candidate));

            const shouldConsolidate = await askConfirmation(
              rl,
              "\nConsolidate this group? [y/N] ",
            );

            if (!shouldConsolidate) {
              console.log("Skipped.");
              skippedCount++;
              continue;
            }
          }

          console.log("\nGenerating consolidated text with AI...");

          try {
            const execResult = await executeConsolidation(
              store,
              candidate,
              orgId,
              repoId,
              {
                model: opts.model,
                preserveOriginals: opts.preserve !== false,
              },
            );

            console.log("\nConsolidation complete!");
            console.log(`  New memory ID: ${execResult.consolidatedId}`);
            console.log(`  Type: ${execResult.memoryType}`);
            console.log(`  Tags: ${execResult.suggestedTags.join(", ") || "none"}`);
            console.log(`  Sources consolidated: ${execResult.sourceIds.length}`);
            console.log(`\nGenerated text:`);
            console.log(`  ${execResult.generatedText}`);

            consolidatedCount++;
          } catch (err) {
            console.error(
              `\nError consolidating: ${err instanceof Error ? err.message : err}`,
            );
            skippedCount++;
          }
        }
      } finally {
        rl.close();
      }

      console.log(`\n${"=".repeat(60)}`);
      console.log("Summary");
      console.log("=".repeat(60));
      console.log(`Consolidated: ${consolidatedCount} groups`);
      console.log(`Skipped: ${skippedCount} groups`);
      console.log(
        `\nOriginal memories are preserved with status 'superseded'.`,
      );
      console.log("Use 'hippo history <id>' to view consolidation history.");
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(1);
    } finally {
      store.close();
    }
  });
