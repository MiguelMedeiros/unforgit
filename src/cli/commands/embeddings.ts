import { Command } from "commander";
import { LocalStore } from "../../db/local.js";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import { generateEmbedding } from "../../core/embeddings.js";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { parsePositiveInt } from "../schemas.js";
import { isJsonMode, outputJson } from "../utils.js";

const cwd = process.cwd();

export const embeddingsCommand = new Command("embeddings")
  .description("Manage memory embeddings for semantic search");

embeddingsCommand
  .command("backfill")
  .description("Generate embeddings for memories that don't have them")
  .option("--batch-size <n>", "Number of memories to process in parallel", "5")
  .option("--delay <ms>", "Delay between batches (ms)", "500")
  .option("--dry-run", "Show what would be done without making changes")
  .option("--model <model>", "OpenAI embedding model", "text-embedding-3-small")
  .action(async (opts) => {
    if (!isInitialized(cwd)) {
      logger.error("Unforgit not initialized. Run 'unforgit init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig(cwd);
    const apiKey = process.env.OPENAI_API_KEY || config.openaiApiKey;

    if (!apiKey && !opts.dryRun) {
      logger.error("OpenAI API key not set.");
      logger.error("Set OPENAI_API_KEY env var or run 'unforgit auth openai <key>'.");
      process.exit(EXIT_ERROR);
    }

    const dbPath = getDbPath(cwd);
    const store = new LocalStore(dbPath);
    const orgId = config.remote.orgId || "local";
    const repoId = config.remote.repoId || "local";

    try {
      const memories = store.getMemoriesWithoutEmbeddings(orgId, repoId);
      const stats = store.getEmbeddingStats(orgId, repoId);

      logger.info(`Embedding stats:`);
      logger.info(`  Total memories: ${stats.total}`);
      logger.info(`  With embedding: ${stats.withEmbedding}`);
      logger.info(`  Without embedding: ${stats.withoutEmbedding}`);
      logger.info("");

      if (memories.length === 0) {
        logger.info("All memories already have embeddings.");
        return;
      }

      logger.info(`Found ${memories.length} memories without embeddings.`);

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
      let errors = 0;

      logger.info(`\nGenerating embeddings (batch size: ${batchSize}, delay: ${delay}ms)...`);

      for (let i = 0; i < memories.length; i += batchSize) {
        const batch = memories.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (memory) => {
            try {
              const result = await generateEmbedding(memory.text, {
                apiKey,
                model: opts.model,
              });
              await store.storeEmbedding(memory.id, result.embedding, result.model);
              processed++;
              logger.progress(processed, memories.length, "embeddings");
            } catch (err) {
              errors++;
              logger.error(`${memory.id.slice(0, 8)}: ${err instanceof Error ? err.message : err}`);
            }
          })
        );

        if (i + batchSize < memories.length) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      logger.info(`\nBackfill complete:`);
      logger.info(`  Processed: ${processed}`);
      logger.info(`  Errors: ${errors}`);
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
    const store = new LocalStore(dbPath);

    try {
      const deleted = store.clearEmbeddings();
      logger.info(`All embeddings cleared (${deleted} removed).`);
    } finally {
      store.close();
    }
  });
