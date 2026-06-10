import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "unforgit-config";
import { LocalStore } from "unforgit-db";
import { RemoteClient } from "unforgit-config";
import { truncate } from "../utils.js";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR } from "../exit-codes.js";

export const pushCommand = new Command("push")
  .description("Push local memories to remote")
  .argument("[remote]", "Remote name to push to", "origin")
  .option("-f, --force", "Force push, overwriting remote conflicts")
  .option("--dry-run", "Show what would be pushed without actually pushing")
  .option("-a, --all", "Push all memories including untracked ones")
  .action(async (remote, opts) => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const store = new LocalStore(getDbPath());

    try {
      const orgId = config.remote.orgId || "local";
      const repoId = config.remote.repoId || "local";

      if (!config.remote.url) {
        logger.fatal(`No remote '${remote}' configured.`);
        logger.error("Use 'unforgit remote add origin <url>' to add a remote.");
        process.exit(EXIT_CONFIG_ERROR);
      }

      const client = new RemoteClient(config.remote.url);

      const pendingPush = store.getPendingPush();
      const untracked = opts.all ? store.getUntrackedMemories(orgId, repoId) : [];
      
      for (const memory of untracked) {
        store.initSyncStateForMemory(memory.id);
      }
      
      const allToPush = opts.all 
        ? [...pendingPush, ...untracked.map(m => ({ memory: m, syncState: store.getSyncState(m.id)! }))]
        : pendingPush;

      const supersededToSync = store.getSupersededMemoriesToSync(orgId, repoId);
      const linksToSync = store.getLinksToSync(orgId, repoId);

      if (allToPush.length === 0 && supersededToSync.length === 0 && linksToSync.length === 0) {
        logger.info("Everything up-to-date");
        return;
      }

      logger.info(`Pushing to ${remote} (${config.remote.url})...`);

      if (opts.dryRun) {
        if (allToPush.length > 0) {
          logger.info("\nWould push the following memories:");
          for (const { memory } of allToPush) {
            logger.info(`  ${memory.id.slice(0, 8)}... "${truncate(memory.text, 50)}"`);
          }
        }
        if (supersededToSync.length > 0) {
          logger.info("\nWould sync superseded status:");
          for (const { memory, newId } of supersededToSync) {
            logger.info(`  ${memory.id.slice(0, 8)}... -> superseded by ${newId.slice(0, 8)}...`);
          }
        }
        if (linksToSync.length > 0) {
          logger.info("\nWould sync links:");
          for (const { link } of linksToSync) {
            logger.info(`  ${link.sourceId.slice(0, 8)}... -> ${link.targetId.slice(0, 8)}... (${link.linkType})`);
          }
        }
        logger.info(`\nTotal: ${allToPush.length} memories, ${supersededToSync.length} status updates, ${linksToSync.length} links`);
        return;
      }

      let pushed = 0;
      let errors = 0;

      for (const { memory, syncState } of allToPush) {
        try {
          const fullMemory = store.getById(memory.id);
          if (!fullMemory) continue;

          if (fullMemory.visibility !== "repo" && !opts.force) {
            logger.info(`  Skipping ${memory.id.slice(0, 8)}... (private memory, use --force to push anyway)`);
            continue;
          }

          await client.store({
            id: fullMemory.id,
            orgId: fullMemory.orgId,
            repoId: fullMemory.repoId,
            memoryType: fullMemory.memoryType,
            text: fullMemory.text,
            summary: fullMemory.summary,
            tags: fullMemory.tags,
            sourceRefs: fullMemory.sourceRefs,
            confidence: fullMemory.confidence,
            ttlSeconds: fullMemory.ttlSeconds,
            visibility: "repo",
            authorId: fullMemory.authorId,
            authorName: fullMemory.authorName,
          });

          store.markAsPushed(memory.id, fullMemory.version);
          pushed++;
          logger.progress(pushed + errors, allToPush.length, "memories");
          logger.debug(`pushed ${memory.id.slice(0, 8)}...`);
        } catch (err) {
          errors++;
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.error(`  ${memory.id.slice(0, 8)}... failed: ${errorMsg}`);

          if (errorMsg.includes("409") || errorMsg.includes("conflict")) {
            if (opts.force) {
              logger.info(`    Forcing overwrite...`);
            } else {
              store.markAsConflict(memory.id, syncState?.remoteVersion ?? 0);
              logger.info(`    Marked as conflict. Use --force to overwrite.`);
            }
          }
        }
      }

      let supersededSynced = 0;

      for (const { memory, newId } of supersededToSync) {
        try {
          await client.supersede(memory.id, newId);
          store.markStatusSynced(memory.id);
          supersededSynced++;
          logger.info(`  ${memory.id.slice(0, 8)}... marked as superseded on remote`);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (!errorMsg.includes("404")) {
            errors++;
            logger.error(`  ${memory.id.slice(0, 8)}... failed to sync superseded status: ${errorMsg}`);
          }
        }
      }

      let linksSynced = 0;

      for (const { link } of linksToSync) {
        try {
          await client.link(link.sourceId, link.targetId, link.linkType, link.metadata);
          store.markLinkSynced(link.id);
          linksSynced++;
          logger.info(`  link ${link.sourceId.slice(0, 8)}... -> ${link.targetId.slice(0, 8)}... (${link.linkType})`);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (!errorMsg.includes("404")) {
            errors++;
            logger.error(`  link ${link.sourceId.slice(0, 8)}... failed: ${errorMsg}`);
          }
        }
      }

      logger.info("");
      if (pushed > 0) {
        logger.info(`${pushed} memory(s) pushed successfully`);
      }
      if (supersededSynced > 0) {
        logger.info(`${supersededSynced} memory(s) marked as superseded on remote`);
      }
      if (linksSynced > 0) {
        logger.info(`${linksSynced} link(s) synced`);
      }
      if (errors > 0) {
        logger.info(`${errors} error(s) during push`);
      }
    } finally {
      store.close();
    }
  });

