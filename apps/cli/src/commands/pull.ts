import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "unforgit-config";
import { LocalStore } from "unforgit-db";
import { RemoteClient } from "unforgit-config";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";

export const pullCommand = new Command("pull")
  .description("Pull remote memories to local")
  .argument("[remote]", "Remote name to pull from", "origin")
  .option("-f, --force", "Force pull, overwriting local conflicts")
  .option("--dry-run", "Show what would be pulled without actually pulling")
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
        logger.fatal("Use 'unforgit remote add origin <url>' to add a remote.");
        process.exit(EXIT_CONFIG_ERROR);
      }

      const client = new RemoteClient(config.remote.url);

      logger.info(`Fetching from ${remote} (${config.remote.url})...`);

      const [remoteMemories, remoteTombstones] = await Promise.all([
        client.syncPull(orgId, repoId),
        client.syncTombstones(orgId, repoId),
      ]);

      if (remoteMemories.length === 0 && remoteTombstones.length === 0) {
        logger.info("Already up to date (no remote changes)");
        return;
      }

      if (opts.dryRun) {
        let newCount = 0;
        let updateCount = 0;
        let deletionCount = 0;

        for (const remoteMem of remoteMemories) {
          const localMem = store.getById(remoteMem.id);
          if (!localMem) {
            newCount++;
          } else {
            updateCount++;
          }
        }
        for (const tombstone of remoteTombstones) {
          if (store.getById(tombstone.memoryId)) deletionCount++;
        }

        logger.info(`\nWould pull:`);
        logger.info(`  ${newCount} new memories`);
        logger.info(`  ${updateCount} updates`);
        logger.info(`  ${deletionCount} deletions`);
        return;
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let conflicts = 0;
      let deleted = 0;

      for (const tombstone of remoteTombstones) {
        if (store.applyTombstone(tombstone)) deleted++;
      }

      for (const remoteMem of remoteMemories) {
        const localMem = store.getById(remoteMem.id);

        const remoteStatus = remoteMem.status ?? "active";

        if (!localMem) {
          store.upsertFromRemote({ ...remoteMem, status: remoteStatus });

          store.setSyncState({
            memoryId: remoteMem.id,
            localVersion: remoteMem.version,
            remoteVersion: remoteMem.version,
            lastPulledAt: new Date(),
            syncStatus: "synced",
          });

          created++;
          const statusNote = remoteStatus !== "active" ? ` [${remoteStatus}]` : "";
          logger.info(`  ${remoteMem.id.slice(0, 8)}... new memory${statusNote}`);
          logger.progress(created + updated + skipped + conflicts, remoteMemories.length, "memories");
        } else {
          const syncState = store.getSyncState(remoteMem.id);

          if (syncState?.syncStatus === "pending_push" && !opts.force) {
            conflicts++;
            store.markAsConflict(remoteMem.id, remoteMem.version);
            logger.info(`  ${remoteMem.id.slice(0, 8)}... conflict (local has unpushed changes)`);
            logger.progress(created + updated + skipped + conflicts, remoteMemories.length, "memories");
            continue;
          }

          const statusChanged = localMem.status !== remoteStatus;
          const result = store.upsertFromRemote(
            { ...remoteMem, status: remoteStatus },
            opts.force ? "remote_wins" : "last_write_wins",
          );

          if (result.conflict && result.action === "skipped") {
            conflicts++;
            store.markAsConflict(remoteMem.id, remoteMem.version);
            logger.info(`  ${remoteMem.id.slice(0, 8)}... conflict (local is newer)`);
            logger.progress(created + updated + skipped + conflicts, remoteMemories.length, "memories");
            continue;
          }

          if (result.action === "skipped") {
            skipped++;
            logger.progress(created + updated + skipped + conflicts, remoteMemories.length, "memories");
            continue;
          }

          store.markAsPulled(remoteMem.id, remoteMem.version);
          updated++;
          const changeType = statusChanged ? "status updated" : "updated";
          const statusNote = remoteStatus !== "active" ? ` [${remoteStatus}]` : "";
          logger.info(`  ${remoteMem.id.slice(0, 8)}... ${changeType}${statusNote}`);
          logger.progress(created + updated + skipped + conflicts, remoteMemories.length, "memories");
        }
      }

      logger.info("");
      logger.info(`Pull complete:`);
      if (created > 0) logger.info(`  ${created} new memories`);
      if (updated > 0) logger.info(`  ${updated} updates`);
      if (deleted > 0) logger.info(`  ${deleted} deletions`);
      if (skipped > 0) logger.info(`  ${skipped} already up to date`);
      if (conflicts > 0) {
        logger.info(`  ${conflicts} conflicts (use --force to overwrite local)`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.fatal(`Could not fetch from remote: ${errorMsg}`);
      process.exit(EXIT_ERROR);
    } finally {
      store.close();
    }
  });
