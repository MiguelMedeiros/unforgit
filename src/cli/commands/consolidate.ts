import { Command } from "commander";
import { loadConfig } from "../config.js";
import { RemoteClient } from "../remote-client.js";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { parsePositiveInt } from "../schemas.js";

export const consolidateCommand = new Command("consolidate")
  .description("Consolidate episodic memories into semantic/procedural")
  .option("--from-pr <url>", "PR URL to consolidate from")
  .option("--from-commit <sha>", "Commit SHA to consolidate from")
  .option("--last-n <n>", "Consolidate the last N memories")
  .action(async (opts) => {
    const config = loadConfig();

    if (!config.remote.url) {
      logger.error("Remote URL not configured. Update unforgit.yaml.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const client = new RemoteClient(config.remote.url, config.remote.apiKey);

    const body: Record<string, unknown> = {
      orgId: config.remote.orgId,
      repoId: config.remote.repoId,
    };

    if (opts.fromPr || opts.fromCommit) {
      body.source = {
        prUrl: opts.fromPr,
        commitSha: opts.fromCommit,
      };
    }

    if (opts.lastN) {
      body.lastN = parsePositiveInt(opts.lastN, "last-n");
    }

    try {
      const result = await client.consolidate(body);

      logger.info("Consolidation complete:");
      logger.info(`  Created: ${result.created.length} memories`);
      logger.info(`  Superseded: ${result.superseded.length} memories`);
      logger.info(`  Processed: ${result.processedCount} total`);

      if (result.created.length > 0) {
        logger.info("\nNew memories:");
        for (const id of result.created) {
          logger.info(`  - ${id}`);
        }
      }
    } catch (err) {
      logger.error(
        `Consolidating: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(EXIT_ERROR);
    }
  });
