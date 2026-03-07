import { Command } from "commander";
import { LocalStore } from "../../db/local.js";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import type { MemoryType } from "../../core/types.js";
import {
  findConsolidationCandidates,
  executeConsolidation,
  formatCandidatePreview,
} from "../../core/auto-consolidate.js";
import * as readline from "readline";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";
import {
  parseThreshold,
  parsePositiveInt,
  validateMemoryType,
} from "../schemas.js";

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
      logger.error("Hippocampus not initialized. Run 'hippo init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    if (opts.type && !validateMemoryType(opts.type)) {
      logger.error("--type must be one of: episodic, semantic, procedural");
      process.exit(EXIT_ERROR);
    }

    const config = loadConfig(cwd);
    const store = new LocalStore(getDbPath(cwd));

    const orgId = config.remote.orgId || "local";
    const repoId = config.remote.repoId || "local";

    const threshold = parseThreshold(opts.threshold);
    const minGroupSize = parsePositiveInt(opts.minGroup, "min-group");
    const maxGroups = parsePositiveInt(opts.maxGroups, "max-groups");
    const types = opts.type ? [opts.type as MemoryType] : undefined;

    try {
      logger.info("Scanning memories for consolidation candidates...\n");

      const result = findConsolidationCandidates(store, orgId, repoId, {
        threshold,
        minGroupSize,
        maxGroups,
        types,
        excludeConsolidations: true,
      });

      logger.info(`Scanned ${result.totalMemoriesScanned} active memories`);
      logger.info(`Found ${result.totalCandidateGroups} potential groups`);
      logger.info(`Showing top ${result.candidates.length} candidates\n`);

      if (result.candidates.length === 0) {
        logger.info("No consolidation candidates found.");
        logger.info(
          "Try lowering the threshold (--threshold 0.3) or the minimum group size (--min-group 2).",
        );
        return;
      }

      for (let i = 0; i < result.candidates.length; i++) {
        const candidate = result.candidates[i];
        logger.info(`\n${"=".repeat(60)}`);
        logger.info(`Candidate ${i + 1}/${result.candidates.length}`);
        logger.info("=".repeat(60));
        logger.info(formatCandidatePreview(candidate));
      }

      if (opts.dryRun) {
        logger.info("\n[Dry run mode - no changes made]");
        logger.info(
          "Remove --dry-run flag to consolidate these memories.",
        );
        return;
      }

      const openaiKey = process.env.OPENAI_API_KEY || config.openaiApiKey;
      if (!openaiKey) {
        logger.error("OpenAI API key not set.");
        logger.error("Set OPENAI_API_KEY env var or run 'hippo auth openai <key>'.");
        process.exit(EXIT_ERROR);
      }
      process.env.OPENAI_API_KEY = openaiKey;

      const rl = createReadlineInterface();
      let consolidatedCount = 0;
      let skippedCount = 0;

      try {
        for (let i = 0; i < result.candidates.length; i++) {
          const candidate = result.candidates[i];

          if (!opts.yes) {
            logger.info(`\n${"─".repeat(60)}`);
            logger.info(`Processing candidate ${i + 1}/${result.candidates.length}`);
            logger.info(formatCandidatePreview(candidate));

            const shouldConsolidate = await askConfirmation(
              rl,
              "\nConsolidate this group? [y/N] ",
            );

            if (!shouldConsolidate) {
              logger.info("Skipped.");
              skippedCount++;
              logger.progress(i + 1, result.candidates.length, "candidates");
              continue;
            }
          }

          logger.info("\nGenerating consolidated text with AI...");

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

            logger.info("\nConsolidation complete!");
            logger.info(`  New memory ID: ${execResult.consolidatedId}`);
            logger.info(`  Type: ${execResult.memoryType}`);
            logger.info(`  Tags: ${execResult.suggestedTags.join(", ") || "none"}`);
            logger.info(`  Sources consolidated: ${execResult.sourceIds.length}`);
            logger.info(`\nGenerated text:`);
            logger.info(`  ${execResult.generatedText}`);

            consolidatedCount++;
          } catch (err) {
            logger.error(
              `Consolidating: ${err instanceof Error ? err.message : err}`,
            );
            skippedCount++;
          }
          logger.progress(i + 1, result.candidates.length, "candidates");
        }
      } finally {
        rl.close();
      }

      logger.info(`\n${"=".repeat(60)}`);
      logger.info("Summary");
      logger.info("=".repeat(60));
      logger.info(`Consolidated: ${consolidatedCount} groups`);
      logger.info(`Skipped: ${skippedCount} groups`);
      logger.info(
        `\nOriginal memories are preserved with status 'superseded'.`,
      );
      logger.info("Use 'hippo history <id>' to view consolidation history.");
    } catch (err) {
      logger.error(
        `Auto-consolidate: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(EXIT_ERROR);
    } finally {
      store.close();
    }
  });
