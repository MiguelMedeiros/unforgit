import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "unforgit-config";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { LocalStore } from "unforgit-db";
import { truncate, isJsonMode, outputJson } from "../utils.js";

type PendingSyncItem = {
  memory: { id: string; text: string; status?: string };
  syncState: {
    localVersion?: number;
    remoteVersion?: number;
    lastPushedAt?: Date;
    lastPulledAt?: Date;
    syncStatus: string;
  };
};

type StatusDetailsItem = {
  id: string;
  preview: string;
  status?: string;
  syncStatus: string;
  localVersion?: number;
  remoteVersion?: number;
  lastPushedAt?: string;
  lastPulledAt?: string;
};

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
      const pendingPull = store.getSyncStatesByStatus("pending_pull")
        .map((syncState) => {
          const memory = store.getById(syncState.memoryId);
          return memory ? { memory, syncState } : undefined;
        })
        .filter((item): item is PendingSyncItem => Boolean(item));
      const conflicts = store.getConflicts();
      const untracked = store.getUntrackedMemories(orgId, repoId);
      const summary = store.getSyncSummary(orgId, repoId);

      if (isJsonMode()) {
        const clean = pendingPush.length === 0 && pendingPull.length === 0 && conflicts.length === 0 && untracked.length === 0;
        outputJson({
          remote: remoteUrl || null,
          remoteConfigured: Boolean(remoteUrl),
          synced: summary.synced,
          pendingPush: pendingPush.length,
          pendingPull: pendingPull.length,
          conflicts: conflicts.length,
          untracked: untracked.length,
          clean,
          recommendations: buildRecommendations(Boolean(remoteUrl), pendingPush.length, pendingPull.length, conflicts.length, untracked.length),
          details: {
            pendingPush: pendingPush.map(toDetailsItem),
            pendingPull: pendingPull.map(toDetailsItem),
            conflicts: conflicts.map(toDetailsItem),
            untracked: untracked.map((memory) => ({ id: memory.id, preview: truncate(memory.text, 80), status: memory.status })),
          },
        });
        return;
      }

      if (opts.short) {
        printShortStatus(pendingPush, pendingPull, conflicts, untracked);
      } else {
        printLongStatus(remoteName, remoteUrl, pendingPush, pendingPull, conflicts, untracked, summary);
      }
    } finally {
      store.close();
    }
  });

function printShortStatus(
  pendingPush: Array<{ memory: { id: string; text: string }; syncState: { syncStatus: string } }>,
  pendingPull: PendingSyncItem[],
  conflicts: Array<{ memory: { id: string; text: string } }>,
  untracked: Array<{ id: string; text: string }>,
): void {
  for (const { memory } of pendingPush) {
    logger.info(`M  ${memory.id.slice(0, 8)} ${truncate(memory.text, 50)}`);
  }
  for (const { memory } of pendingPull) {
    logger.info(`P  ${memory.id.slice(0, 8)} ${truncate(memory.text, 50)}`);
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
  pendingPull: PendingSyncItem[],
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

  if (pendingPush.length === 0 && pendingPull.length === 0 && conflicts.length === 0 && untracked.length === 0) {
    logger.info("Nothing to push or pull, working tree clean");
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

  if (pendingPull.length > 0) {
    logger.info("Changes to be pulled:");
    logger.info('  (use "unforgit pull" to sync from remote)');
    logger.info("");
    for (const { memory } of pendingPull) {
      logger.info(`        remote update: ${memory.id.slice(0, 8)}... "${truncate(memory.text, 40)}"`);
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

  const total = pendingPush.length + pendingPull.length + conflicts.length + untracked.length;
  logger.info(`${total} change(s) pending`);
}

function buildRecommendations(
  remoteConfigured: boolean,
  pendingPush: number,
  pendingPull: number,
  conflicts: number,
  untracked: number,
): string[] {
  const recommendations: string[] = [];

  if (!remoteConfigured && (pendingPush > 0 || pendingPull > 0 || untracked > 0)) {
    recommendations.push("Configure a remote with 'unforgit remote add origin <url>' or keep this repository intentionally local-only.");
    return recommendations;
  }

  if (conflicts > 0) {
    recommendations.push("Review conflicts, then run 'unforgit pull --force' to accept remote or 'unforgit push --force' to keep local.");
  }
  if (pendingPush > 0 || untracked > 0) {
    recommendations.push("Run 'unforgit push' to publish local memory changes.");
  }
  if (pendingPull > 0) {
    recommendations.push("Run 'unforgit pull' to fetch remote memory changes.");
  }

  return recommendations;
}

function toDetailsItem(item: PendingSyncItem): StatusDetailsItem {
  const { memory, syncState } = item;
  return {
    id: memory.id,
    preview: truncate(memory.text, 80),
    status: memory.status,
    syncStatus: syncState.syncStatus,
    localVersion: syncState.localVersion,
    remoteVersion: syncState.remoteVersion,
    lastPushedAt: syncState.lastPushedAt?.toISOString(),
    lastPulledAt: syncState.lastPulledAt?.toISOString(),
  };
}
