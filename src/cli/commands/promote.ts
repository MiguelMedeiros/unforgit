import { Command } from "commander";
import { loadConfig, getDbPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";
import { logger } from "../logger.js";
import { EXIT_ERROR } from "../exit-codes.js";

export const promoteCommand = new Command("promote")
  .description("Promote a local memory to remote (shared)")
  .argument("<id>", "Memory ID to promote")
  .option("--to <scope>", "Target scope", "repo")
  .option("--source-pr <url>", "Source PR URL")
  .option("--source-commit <sha>", "Source commit SHA")
  .action(async (id, opts) => {
    const config = loadConfig();

    if (!config.remote.url) {
      logger.error("Remote URL not configured. Update hippo.yaml.");
      process.exit(EXIT_ERROR);
    }

    const store = new LocalStore(getDbPath());

    try {
      const memory = store.getById(id);

      if (!memory) {
        logger.error(`Memory ${id} not found locally.`);
        process.exit(EXIT_ERROR);
      }

      const sourceRefs = { ...(memory.sourceRefs ?? {}) };
      if (opts.sourcePr) sourceRefs.pr_url = opts.sourcePr;
      if (opts.sourceCommit) sourceRefs.commit_sha = opts.sourceCommit;

      const client = new RemoteClient(config.remote.url, config.remote.apiKey);

      const result = await client.store({
        orgId: config.remote.orgId || memory.orgId,
        repoId: config.remote.repoId || memory.repoId,
        memoryType: memory.memoryType,
        text: memory.text,
        summary: memory.summary,
        tags: memory.tags,
        sourceRefs,
        confidence: memory.confidence,
        visibility: "repo",
      });

      store.updateVisibility(id, "repo");

      logger.info(`Promoted memory ${id.slice(0, 8)}... to remote.`);
      logger.info(`  Remote ID: ${result.id}`);
      logger.info(`  Scope: ${opts.to}`);
    } catch (err) {
      logger.error(
        `Promoting memory: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(EXIT_ERROR);
    } finally {
      store.close();
    }
  });
