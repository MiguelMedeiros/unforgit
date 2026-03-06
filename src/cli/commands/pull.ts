import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";

export const pullCommand = new Command("pull")
  .description("Pull remote memories to local")
  .argument("[remote]", "Remote name to pull from", "origin")
  .option("-f, --force", "Force pull, overwriting local conflicts")
  .option("--dry-run", "Show what would be pulled without actually pulling")
  .action(async (remote, opts) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadConfig();
    const store = new LocalStore(getDbPath());

    try {
      const orgId = config.remote.orgId || "local";
      const repoId = config.remote.repoId || "local";

      if (!config.remote.url) {
        console.error(`fatal: No remote '${remote}' configured.`);
        console.error("Use 'hippo remote add origin <url>' to add a remote.");
        process.exit(1);
      }

      const client = new RemoteClient(config.remote.url, config.remote.apiKey);

      console.log(`Fetching from ${remote} (${config.remote.url})...`);

      const response = await client.recall({
        orgId,
        repoId,
        query: "*",
        k: 1000,
        includeDeprecated: true,
      });

      const remoteMemories = response.results;

      if (remoteMemories.length === 0) {
        console.log("Already up to date (no memories on remote)");
        return;
      }

      if (opts.dryRun) {
        let newCount = 0;
        let updateCount = 0;

        for (const remoteMem of remoteMemories) {
          const localMem = store.getById(remoteMem.id);
          if (!localMem) {
            newCount++;
          } else {
            updateCount++;
          }
        }

        console.log(`\nWould pull:`);
        console.log(`  ${newCount} new memories`);
        console.log(`  ${updateCount} updates`);
        return;
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let conflicts = 0;

      for (const remoteMem of remoteMemories) {
        const localMem = store.getById(remoteMem.id);

        const remoteStatus = remoteMem.status ?? "active";

        if (!localMem) {
          store.upsertFromRemote({
            id: remoteMem.id,
            orgId,
            repoId,
            scopeType: "repo",
            memoryType: remoteMem.memoryType,
            visibility: "repo",
            status: remoteStatus,
            text: remoteMem.text,
            summary: remoteMem.summary,
            tags: remoteMem.tags,
            sourceRefs: remoteMem.sourceRefs,
            supersedesId: remoteMem.supersedesId,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          store.setSyncState({
            memoryId: remoteMem.id,
            localVersion: 1,
            remoteVersion: 1,
            lastPulledAt: new Date(),
            syncStatus: "synced",
          });

          created++;
          const statusNote = remoteStatus !== "active" ? ` [${remoteStatus}]` : "";
          console.log(`  ↓ ${remoteMem.id.slice(0, 8)}... new memory${statusNote}`);
        } else {
          const syncState = store.getSyncState(remoteMem.id);
          const localVersion = syncState?.localVersion ?? localMem.version;
          const remoteVersion = syncState?.remoteVersion ?? 0;

          if (syncState?.syncStatus === "pending_push" && !opts.force) {
            conflicts++;
            store.markAsConflict(remoteMem.id, remoteVersion + 1);
            console.log(`  ⚠ ${remoteMem.id.slice(0, 8)}... conflict (local has unpushed changes)`);
            continue;
          }

          const statusChanged = localMem.status !== remoteStatus;
          const textChanged = localMem.text !== remoteMem.text;

          if (!textChanged && !statusChanged) {
            skipped++;
            continue;
          }

          if (opts.force || syncState?.syncStatus !== "pending_push") {
            store.upsertFromRemote({
              id: remoteMem.id,
              orgId,
              repoId,
              scopeType: "repo",
              memoryType: remoteMem.memoryType,
              visibility: "repo",
              status: remoteStatus,
              text: remoteMem.text,
              summary: remoteMem.summary,
              tags: remoteMem.tags,
              sourceRefs: remoteMem.sourceRefs,
              supersedesId: remoteMem.supersedesId,
              version: localVersion + 1,
              createdAt: localMem.createdAt,
              updatedAt: new Date(),
            });

            store.markAsPulled(remoteMem.id, localVersion + 1);
            updated++;
            const changeType = statusChanged && !textChanged ? "status updated" : "updated";
            const statusNote = remoteStatus !== "active" ? ` [${remoteStatus}]` : "";
            console.log(`  ↓ ${remoteMem.id.slice(0, 8)}... ${changeType}${statusNote}`);
          }
        }
      }

      console.log();
      console.log(`Pull complete:`);
      if (created > 0) console.log(`  ${created} new memories`);
      if (updated > 0) console.log(`  ${updated} updates`);
      if (skipped > 0) console.log(`  ${skipped} already up to date`);
      if (conflicts > 0) {
        console.log(`  ${conflicts} conflicts (use --force to overwrite local)`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`fatal: Could not fetch from remote: ${errorMsg}`);
      process.exit(1);
    } finally {
      store.close();
    }
  });
