import { Command } from "commander";
import { LocalStore } from "../../db/local.js";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import { generateEmbedding } from "../../core/embeddings.js";

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
      console.error("Hippocampus not initialized. Run 'hippo init' first.");
      process.exit(1);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey && !opts.dryRun) {
      console.error("OPENAI_API_KEY not set. Required for embedding generation.");
      process.exit(1);
    }

    const config = loadConfig(cwd);
    const dbPath = getDbPath(cwd);
    const store = new LocalStore(dbPath);
    const orgId = config.remote.orgId || "local";
    const repoId = config.remote.repoId || "local";

    try {
      const memories = store.getMemoriesWithoutEmbeddings(orgId, repoId);
      const stats = store.getEmbeddingStats(orgId, repoId);

      console.log(`Embedding stats:`);
      console.log(`  Total memories: ${stats.total}`);
      console.log(`  With embedding: ${stats.withEmbedding}`);
      console.log(`  Without embedding: ${stats.withoutEmbedding}`);
      console.log();

      if (memories.length === 0) {
        console.log("All memories already have embeddings.");
        return;
      }

      console.log(`Found ${memories.length} memories without embeddings.`);

      if (opts.dryRun) {
        console.log("\n[Dry run - no changes made]");
        console.log("Would generate embeddings for:");
        for (const m of memories.slice(0, 10)) {
          console.log(`  - ${m.id.slice(0, 8)}: ${m.text.slice(0, 50)}...`);
        }
        if (memories.length > 10) {
          console.log(`  ... and ${memories.length - 10} more`);
        }
        return;
      }

      const batchSize = parseInt(opts.batchSize, 10);
      const delay = parseInt(opts.delay, 10);
      let processed = 0;
      let errors = 0;

      console.log(`\nGenerating embeddings (batch size: ${batchSize}, delay: ${delay}ms)...`);

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
              process.stdout.write(
                `\rProcessed: ${processed}/${memories.length} (${errors} errors)`
              );
            } catch (err) {
              errors++;
              console.error(`\nError for ${memory.id.slice(0, 8)}: ${err}`);
            }
          })
        );

        if (i + batchSize < memories.length) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      console.log(`\n\nBackfill complete:`);
      console.log(`  Processed: ${processed}`);
      console.log(`  Errors: ${errors}`);
    } finally {
      store.close();
    }
  });

embeddingsCommand
  .command("stats")
  .description("Show embedding statistics")
  .action(async () => {
    if (!isInitialized(cwd)) {
      console.error("Hippocampus not initialized. Run 'hippo init' first.");
      process.exit(1);
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

      console.log("Embedding Statistics");
      console.log("====================");
      console.log(`Total memories:     ${stats.total}`);
      console.log(`With embedding:     ${stats.withEmbedding}`);
      console.log(`Without embedding:  ${stats.withoutEmbedding}`);
      console.log(`Coverage:           ${coverage}%`);

      if (stats.withoutEmbedding > 0) {
        console.log(`\nRun 'hippo embeddings backfill' to generate missing embeddings.`);
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
      console.error("Hippocampus not initialized. Run 'hippo init' first.");
      process.exit(1);
    }

    if (!opts.yes) {
      console.log("This will delete all embeddings. They will need to be regenerated.");
      console.log("Use --yes to confirm.");
      return;
    }

    const dbPath = getDbPath(cwd);
    const store = new LocalStore(dbPath);

    try {
      const db = (store as unknown as { db: { exec: (sql: string) => void } }).db;
      db.exec("DELETE FROM memory_embeddings");
      console.log("All embeddings cleared.");
    } finally {
      store.close();
    }
  });
