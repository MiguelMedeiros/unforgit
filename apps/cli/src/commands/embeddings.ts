import { Command } from "commander";
import { LocalStore } from "unforgit-db";
import { loadConfig, getDbPath, isInitialized } from "unforgit-config";
import { generateEmbedding, resolveEmbeddingProvider } from "unforgit-core";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { parsePositiveInt } from "unforgit-config";
import { isJsonMode, outputJson } from "../utils.js";
import { createLocalDatabaseBackup } from "./backups.js";

const cwd = process.cwd();

type EmbeddingStats = {
  total: number;
  withEmbedding: number;
  withoutEmbedding: number;
};

export type EmbeddingBackfillFailure = {
  id: string;
  textPreview: string;
  error: string;
};

function embeddingCoverage(stats: EmbeddingStats): number {
  return stats.total > 0 ? Number(((stats.withEmbedding / stats.total) * 100).toFixed(1)) : 0;
}

export function buildBackfillJsonPayload(options: {
  dryRun: boolean;
  model: string;
  provider?: string;
  statsBefore: EmbeddingStats;
  statsAfter?: EmbeddingStats;
  planned: number;
  processed: number;
  failures?: EmbeddingBackfillFailure[];
  previews?: Array<{ id: string; textPreview: string }>;
  truncated?: boolean;
}) {
  const statsAfter = options.statsAfter ?? options.statsBefore;
  const failures = options.failures ?? [];
  return {
    dryRun: options.dryRun,
    model: options.model,
    ...(options.provider ? { provider: options.provider } : {}),
    planned: options.planned,
    processed: options.processed,
    errors: failures.length,
    failures,
    statsBefore: {
      ...options.statsBefore,
      coverage: embeddingCoverage(options.statsBefore),
    },
    statsAfter: {
      ...statsAfter,
      coverage: embeddingCoverage(statsAfter),
    },
    ...(options.previews ? { memories: options.previews, truncated: Boolean(options.truncated) } : {}),
  };
}

export const embeddingsCommand = new Command("embeddings")
  .description("Manage memory embeddings for semantic search");

embeddingsCommand
  .command("backfill")
  .description("Generate embeddings for memories that don't have them")
  .option("--batch-size <n>", "Number of memories to process in parallel", "5")
  .option("--delay <ms>", "Delay between batches (ms)", "500")
  .option("--dry-run", "Show what would be done without making changes")
  .option("--provider <provider>", "Embedding provider: auto, local, openai, disabled")
  .option("--model <model>", "Embedding model (defaults to configured provider model)")
  .action(async (opts) => {
    if (!isInitialized(cwd)) {
      logger.error("Unforgit not initialized. Run 'unforgit init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig(cwd);
    const embeddingConfig = {
      provider: opts.provider ?? config.embeddings?.provider ?? "auto",
      model: opts.model ?? config.embeddings?.model,
      apiKey: process.env.OPENAI_API_KEY,
    };
    const provider = resolveEmbeddingProvider(embeddingConfig);

    if (!provider.available && !opts.dryRun) {
      logger.error(provider.reason ?? "Embedding provider is not available.");
      logger.error("Use 'unforgit config set embeddings.provider local' for no-key local embeddings.");
      process.exit(EXIT_ERROR);
    }

    const dbPath = getDbPath(cwd);
    const store = new LocalStore(dbPath);
    const orgId = config.remote.orgId || "local";
    const repoId = config.remote.repoId || "local";

    try {
      const memories = store.getMemoriesWithoutEmbeddings(orgId, repoId, {
        model: provider.model,
        provider: provider.provider,
        dimensions: provider.dimensions,
      });
      const stats = store.getEmbeddingStats(orgId, repoId);

      if (isJsonMode() && opts.dryRun) {
        outputJson(buildBackfillJsonPayload({
          dryRun: true,
          model: provider.model,
          provider: provider.provider,
          statsBefore: stats,
          planned: memories.length,
          processed: 0,
          previews: memories.slice(0, 10).map((memory) => ({
            id: memory.id,
            textPreview: memory.text.slice(0, 80),
          })),
          truncated: memories.length > 10,
        }));
        return;
      }

      logger.info(`Embedding stats:`);
      logger.info(`  Total memories: ${stats.total}`);
      logger.info(`  With embedding: ${stats.withEmbedding}`);
      logger.info(`  Without embedding: ${stats.withoutEmbedding}`);
      logger.info("");

      if (memories.length === 0) {
        if (isJsonMode()) {
          outputJson(buildBackfillJsonPayload({
            dryRun: Boolean(opts.dryRun),
            model: provider.model,
            provider: provider.provider,
            statsBefore: stats,
            planned: 0,
            processed: 0,
          }));
          return;
        }
        logger.info("All memories already have embeddings.");
        return;
      }

      logger.info(`Found ${memories.length} memories without embeddings.`);
      logger.info(`Embedding provider: ${provider.provider}`);
      logger.info(`Embedding model: ${provider.model}`);

      if (opts.dryRun) {
        logger.info("\n[Dry run - no changes made]");
        logger.info("Would generate embeddings for:");
        for (const m of memories.slice(0, 10)) {
          logger.info(`  - ${m.id.slice(0, 8)}: ${m.text.slice(0, 50)}...`);
        }
        if (memories.length > 10) {
          logger.info(`  ... and ${memories.length - 10} more`);
        }
        return;
      }

      const batchSize = parsePositiveInt(opts.batchSize, "batch-size");
      const delay = parsePositiveInt(opts.delay, "delay");
      let processed = 0;
      const failures: EmbeddingBackfillFailure[] = [];

      logger.info(`\nGenerating embeddings (batch size: ${batchSize}, delay: ${delay}ms)...`);

      for (let i = 0; i < memories.length; i += batchSize) {
        const batch = memories.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (memory) => {
            try {
              const result = await generateEmbedding(memory.text, {
                ...embeddingConfig,
              });
              await store.storeEmbedding(memory.id, result.embedding, result.model, result.provider);
              processed++;
              logger.progress(processed, memories.length, "embeddings");
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              failures.push({
                id: memory.id,
                textPreview: memory.text.slice(0, 80),
                error: message,
              });
              logger.error(`${memory.id.slice(0, 8)}: ${message}`);
            }
          })
        );

        if (i + batchSize < memories.length) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      logger.info(`\nBackfill complete:`);
      logger.info(`  Processed: ${processed}`);
      logger.info(`  Errors: ${failures.length}`);
      const statsAfter = store.getEmbeddingStats(orgId, repoId);
      if (isJsonMode()) {
        outputJson(buildBackfillJsonPayload({
          dryRun: false,
          model: provider.model,
          provider: provider.provider,
          statsBefore: stats,
          statsAfter,
          planned: memories.length,
          processed,
          failures,
        }));
      }
      if (failures.length > 0) {
        process.exitCode = EXIT_ERROR;
      }
    } finally {
      store.close();
    }
  });

embeddingsCommand
  .command("stats")
  .description("Show embedding statistics")
  .action(async () => {
    if (!isInitialized(cwd)) {
      logger.error("Unforgit not initialized. Run 'unforgit init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig(cwd);
    const dbPath = getDbPath(cwd);
    const store = new LocalStore(dbPath);
    const orgId = config.remote.orgId || "local";
    const repoId = config.remote.repoId || "local";

    try {
      const stats = store.getEmbeddingStats(orgId, repoId);
      const coverage = stats.total > 0
        ? ((stats.withEmbedding / stats.total) * 100).toFixed(1)
        : "0";

      if (isJsonMode()) {
        outputJson({ ...stats, coverage: parseFloat(coverage) });
        return;
      }

      logger.info("Embedding Statistics");
      logger.info("====================");
      logger.info(`Total memories:     ${stats.total}`);
      logger.info(`With embedding:     ${stats.withEmbedding}`);
      logger.info(`Without embedding:  ${stats.withoutEmbedding}`);
      logger.info(`Coverage:           ${coverage}%`);

      if (stats.withoutEmbedding > 0) {
        logger.info(`\nRun 'unforgit embeddings backfill' to generate missing embeddings.`);
      }
    } finally {
      store.close();
    }
  });

embeddingsCommand
  .command("clear")
  .description("Remove all embeddings (requires regeneration)")
  .option("--yes", "Skip confirmation")
  .option("--no-backup", "Skip automatic local database backup before clearing embeddings")
  .action(async (opts) => {
    if (!isInitialized(cwd)) {
      logger.error("Unforgit not initialized. Run 'unforgit init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    if (!opts.yes) {
      logger.info("This will delete all embeddings. They will need to be regenerated.");
      logger.info("Use --yes to confirm.");
      return;
    }

    const dbPath = getDbPath(cwd);
    if (opts.backup !== false) {
      try {
        const backup = createLocalDatabaseBackup(dbPath, "embeddings-clear");
        if (backup) {
          logger.info(`Created local embeddings backup: ${backup.dir}`);
        }
      } catch (err) {
        logger.error(
          `Failed to create local embeddings backup: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(EXIT_ERROR);
      }
    }

    const store = new LocalStore(dbPath);

    try {
      const deleted = store.clearEmbeddings();
      logger.info(`All embeddings cleared (${deleted} removed).`);
    } finally {
      store.close();
    }
  });
