import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";

export const pushCommand = new Command("push")
  .description("Push local memories to remote")
  .argument("[remote]", "Remote name to push to", "origin")
  .option("-f, --force", "Force push, overwriting remote conflicts")
  .option("--dry-run", "Show what would be pushed without actually pushing")
  .option("-a, --all", "Push all memories including untracked ones")
  .action(async (remote, opts) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadConfig();
    const store = new LocalStore(getDbPath());
    const orgId = config.remote.orgId || "local";
    const repoId = config.remote.repoId || "local";

    if (!config.remote.url) {
      console.error(`fatal: No remote '${remote}' configured.`);
      console.error("Use 'hippo remote add origin <url>' to add a remote.");
      store.close();
      process.exit(1);
    }

    const client = new RemoteClient(config.remote.url, config.remote.apiKey);

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
      console.log("Everything up-to-date");
      store.close();
      return;
    }

    console.log(`Pushing to ${remote} (${config.remote.url})...`);

    if (opts.dryRun) {
      if (allToPush.length > 0) {
        console.log("\nWould push the following memories:");
        for (const { memory } of allToPush) {
          console.log(`  ${memory.id.slice(0, 8)}... "${truncate(memory.text, 50)}"`);
        }
      }
      if (supersededToSync.length > 0) {
        console.log("\nWould sync superseded status:");
        for (const { memory, newId } of supersededToSync) {
          console.log(`  ${memory.id.slice(0, 8)}... → superseded by ${newId.slice(0, 8)}...`);
        }
      }
      if (linksToSync.length > 0) {
        console.log("\nWould sync links:");
        for (const { link } of linksToSync) {
          console.log(`  ${link.sourceId.slice(0, 8)}... → ${link.targetId.slice(0, 8)}... (${link.linkType})`);
        }
      }
      console.log(`\nTotal: ${allToPush.length} memories, ${supersededToSync.length} status updates, ${linksToSync.length} links`);
      store.close();
      return;
    }

    let pushed = 0;
    let errors = 0;

    for (const { memory, syncState } of allToPush) {
      try {
        const fullMemory = store.getById(memory.id);
        if (!fullMemory) continue;

        if (fullMemory.visibility !== "repo" && !opts.force) {
          console.log(`  Skipping ${memory.id.slice(0, 8)}... (private memory, use --force to push anyway)`);
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
        console.log(`  ✓ ${memory.id.slice(0, 8)}... pushed`);
      } catch (err) {
        errors++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ ${memory.id.slice(0, 8)}... failed: ${errorMsg}`);

        if (errorMsg.includes("409") || errorMsg.includes("conflict")) {
          if (opts.force) {
            console.log(`    Forcing overwrite...`);
          } else {
            store.markAsConflict(memory.id, syncState?.remoteVersion ?? 0);
            console.log(`    Marked as conflict. Use --force to overwrite.`);
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
        console.log(`  ✓ ${memory.id.slice(0, 8)}... marked as superseded on remote`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (!errorMsg.includes("404")) {
          errors++;
          console.error(`  ✗ ${memory.id.slice(0, 8)}... failed to sync superseded status: ${errorMsg}`);
        }
      }
    }

    let linksSynced = 0;

    for (const { link } of linksToSync) {
      try {
        await client.link(link.sourceId, link.targetId, link.linkType, link.metadata);
        store.markLinkSynced(link.id);
        linksSynced++;
        console.log(`  ✓ link ${link.sourceId.slice(0, 8)}... → ${link.targetId.slice(0, 8)}... (${link.linkType})`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (!errorMsg.includes("404")) {
          errors++;
          console.error(`  ✗ link ${link.sourceId.slice(0, 8)}... failed: ${errorMsg}`);
        }
      }
    }

    console.log();
    if (pushed > 0) {
      console.log(`${pushed} memory(s) pushed successfully`);
    }
    if (supersededSynced > 0) {
      console.log(`${supersededSynced} memory(s) marked as superseded on remote`);
    }
    if (linksSynced > 0) {
      console.log(`${linksSynced} link(s) synced`);
    }
    if (errors > 0) {
      console.log(`${errors} error(s) during push`);
    }

    store.close();
  });

function truncate(text: string, maxLength: number): string {
  const singleLine = text.replace(/\n/g, " ").trim();
  if (singleLine.length <= maxLength) return singleLine;
  return singleLine.slice(0, maxLength - 3) + "...";
}
