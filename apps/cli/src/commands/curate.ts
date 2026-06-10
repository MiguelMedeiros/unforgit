import { Command } from "commander";
import { getDbPath, isInitialized, loadConfig } from "unforgit-config";
import { LocalStore } from "unforgit-db";
import { RemoteClient } from "unforgit-config";
import { runLocalLifecycleMaintenance } from "unforgit-core";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR, EXIT_ERROR } from "../exit-codes.js";
import { isJsonMode, outputJson } from "../utils.js";

function formatCandidatePreview(candidate: {
  reason: string;
  suggestedTags: string[];
  memories: Array<{ id: string; memoryType: string; text: string }>;
}): string {
  const lines = [
    `Group: ${candidate.reason}`,
    `Tags: ${candidate.suggestedTags.join(", ") || "none"}`,
    "Memories:",
  ];

  for (const memory of candidate.memories) {
    const text = memory.text.length > 80 ? `${memory.text.slice(0, 80)}...` : memory.text;
    lines.push(`  - [${memory.memoryType}] ${memory.id.slice(0, 8)}: ${text}`);
  }

  return lines.join("\n");
}

export const curateCommand = new Command("curate")
  .description("Preview or run lifecycle maintenance for repository memories")
  .option("--remote", "Run maintenance against the remote server")
  .option("--execute", "Apply changes instead of previewing them")
  .option("--model <model>", "OpenAI model to use for consolidation")
  .option("--no-preserve", "Do not preserve original memories during consolidation")
  .addHelpText("after", `
Examples:
  unforgit curate
  unforgit curate --execute
  unforgit curate --remote --execute --model gpt-5.4`)
  .action(async (opts) => {
    if (!isInitialized()) {
      logger.error("Unforgit not initialized. Run 'unforgit init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const orgId = config.remote.orgId || "local";
    const repoId = config.remote.repoId || "local";
    const dryRun = opts.execute ? false : undefined;

    try {
      const result = opts.remote
        ? await runRemoteCurate(config.remote.url, {
            orgId,
            repoId,
            dryRun,
            model: opts.model,
            preserveOriginals: opts.preserve !== false,
          })
        : await runLocalCurate(getDbPath(), orgId, repoId, {
            dryRun,
            model: opts.model,
            preserveOriginals: opts.preserve !== false,
            lifecycle: config.lifecycle,
          });

      if (isJsonMode()) {
        outputJson(result);
        return;
      }

      logger.info(result.dryRun ? "Lifecycle maintenance preview\n" : "Lifecycle maintenance execution\n");
      logger.info(`Active memories scanned: ${result.totalActiveMemories}`);
      logger.info(`Expiring episodic memories: ${result.expiredCandidates.length}`);
      logger.info(`Strengthened candidates: ${result.strengthenedCandidates.length}`);
      logger.info(`Consolidation candidates: ${result.consolidationCandidates.length}`);

      if (result.expiredCandidates.length > 0) {
        logger.info("\nExpired candidates:");
        for (const candidate of result.expiredCandidates.slice(0, 10)) {
          logger.info(`  ${candidate.id.slice(0, 8)} (${candidate.ttlSeconds}s): ${candidate.textPreview}`);
        }
      }

      if (result.strengthenedCandidates.length > 0) {
        logger.info("\nStrengthened candidates:");
        for (const candidate of result.strengthenedCandidates.slice(0, 10)) {
          logger.info(
            `  ${candidate.id.slice(0, 8)} [${candidate.recommendedAction}] (${candidate.usageCount} recalls): ${candidate.textPreview}`,
          );
        }
      }

      if (result.consolidationCandidates.length > 0) {
        logger.info("\nConsolidation candidates:");
        for (const candidate of result.consolidationCandidates.slice(0, 5)) {
          logger.info(formatCandidatePreview(candidate));
          logger.info("");
        }
      }

      if (!result.dryRun && result.executedConsolidations.length > 0) {
        logger.info("Executed consolidations:");
        for (const executed of result.executedConsolidations) {
          logger.info(
            `  ${executed.consolidatedId.slice(0, 8)} from ${executed.sourceIds.length} memories`,
          );
        }
      }

      for (const warning of result.warnings) {
        logger.warn(warning);
      }

      for (const error of result.errors) {
        logger.error(error);
      }

      if (result.dryRun) {
        logger.info("\nDry run complete. Re-run with --execute to apply expiry and consolidation.");
      }
    } catch (error) {
      logger.error(
        `Curate: ${error instanceof Error ? error.message : error}`,
      );
      process.exit(EXIT_ERROR);
    }
  });

async function runLocalCurate(
  dbPath: string,
  orgId: string,
  repoId: string,
  options: Parameters<typeof runLocalLifecycleMaintenance>[3],
) {
  const store = new LocalStore(dbPath);
  try {
    return await runLocalLifecycleMaintenance(store, orgId, repoId, options);
  } finally {
    store.close();
  }
}

async function runRemoteCurate(
  remoteUrl: string,
  options: {
    orgId: string;
    repoId: string;
    dryRun?: boolean;
    model?: string;
    preserveOriginals?: boolean;
  },
) {
  if (!remoteUrl) {
    throw new Error("Remote URL not configured. Update unforgit.yaml or omit --remote.");
  }

  const client = new RemoteClient(remoteUrl);
  return client.runLifecycle(options);
}
