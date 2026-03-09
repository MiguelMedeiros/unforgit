import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "@unforgit/config";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { LocalStore } from "@unforgit/db";
import { truncate, isJsonMode, outputJson } from "../utils.js";

export const statusCommand = new Command("status")
  .description("Show the working tree status (pending sync state)")
  .option("-s, --short", "Give the output in short format")
  .addHelpText("after", `
Examples:
  unforgit status         Show full sync status
  unforgit status -s      Short format
  unforgit status --json  Machine-readable output`)
  .action((opts) => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository (or any of the parent directories)");
      logger.fatal("Run 'unforgit init' to initialize.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const store = new LocalStore(getDbPath());

    try {
      const orgId = config.remote.orgId || "local";
      const repoId = config.remote.repoId || "local";

      const remoteUrl = config.remote.url;
      const remoteName = "origin";

      const pendingPush = store.getPendingPush();
      const conflicts = store.getConflicts();
      const untracked = store.getUntrackedMemories(orgId, repoId);
      const summary = store.getSyncSummary(orgId, repoId);

      if (isJsonMode()) {
        outputJson({
          remote: remoteUrl || null,
          pendingPush: pendingPush.length,
          conflicts: conflicts.length,
          untracked: untracked.length,
          synced: summary.synced,
        });
        return;
      }

      if (opts.short) {
        printShortStatus(pendingPush, conflicts, untracked);
      } else {
        printLongStatus(remoteName, remoteUrl, pendingPush, conflicts, untracked, summary);
      }
    } finally {
      store.close();
    }
  });

function printShortStatus(
  pendingPush: Array<{ memory: { id: string; text: string }; syncState: { syncStatus: string } }>,
  conflicts: Array<{ memory: { id: string; text: string } }>,
  untracked: Array<{ id: string; text: string }>,
): void {
  for (const { memory } of pendingPush) {
    logger.info(`M  ${memory.id.slice(0, 8)} ${truncate(memory.text, 50)}`);
  }
  for (const { memory } of conflicts) {
    logger.info(`C  ${memory.id.slice(0, 8)} ${truncate(memory.text, 50)}`);
  }
  for (const memory of untracked) {
    logger.info(`?? ${memory.id.slice(0, 8)} ${truncate(memory.text, 50)}`);
  }
}

function printLongStatus(
  remoteName: string,
  remoteUrl: string,
  pendingPush: Array<{ memory: { id: string; text: string; status: string }; syncState: { syncStatus: string } }>,
  conflicts: Array<{ memory: { id: string; text: string } }>,
  untracked: Array<{ id: string; text: string }>,
  summary: { synced: number; pendingPush: number; pendingPull: number; conflicts: number },
): void {
  if (remoteUrl) {
    logger.info(`Remote '${remoteName}' at ${remoteUrl}`);
  } else {
    logger.info("No remote configured. Use 'unforgit remote add origin <url>' to add one.");
  }
  logger.info("");

  if (pendingPush.length === 0 && conflicts.length === 0 && untracked.length === 0) {
    logger.info("Nothing to push, working tree clean");
    if (summary.synced > 0) {
      logger.info(`  ${summary.synced} memories synced with remote`);
    }
    return;
  }

  if (pendingPush.length > 0) {
    logger.info("Changes to be pushed:");
    logger.info('  (use "unforgit push" to sync with remote)');
    logger.info("");
    for (const { memory } of pendingPush) {
      const action = memory.status === "active" ? "new memory" : "modified";
      logger.info(`        ${action}:   ${memory.id.slice(0, 8)}... "${truncate(memory.text, 40)}"`);
    }
    logger.info("");
  }

  if (conflicts.length > 0) {
    logger.info("Conflicts:");
    logger.info('  (use "unforgit push --force" to overwrite remote or "unforgit pull --force" to accept remote)');
    logger.info("");
    for (const { memory } of conflicts) {
      logger.info(`        conflict:  ${memory.id.slice(0, 8)}... "${truncate(memory.text, 40)}"`);
    }
    logger.info("");
  }

  if (untracked.length > 0) {
    logger.info("Untracked memories:");
    logger.info('  (these memories were created before sync tracking was enabled)');
    logger.info('  (use "unforgit push" to sync them)');
    logger.info("");
    for (const memory of untracked) {
      logger.info(`        ${memory.id.slice(0, 8)}... "${truncate(memory.text, 40)}"`);
    }
    logger.info("");
  }

  const total = pendingPush.length + conflicts.length + untracked.length;
  logger.info(`${total} change(s) pending`);
}
