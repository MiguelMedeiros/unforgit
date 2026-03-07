import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";
import { truncate, isJsonMode, outputJson } from "../utils.js";

export const diffCommand = new Command("diff")
  .description("Show differences between local and remote memories")
  .argument("[memoryId]", "Specific memory ID to diff")
  .option("--stat", "Show only statistics")
  .addHelpText("after", `
Examples:
  hippo diff              Show all differences
  hippo diff --stat       Show difference statistics only
  hippo diff abc12345     Diff a specific memory`)
  .action(async (memoryId, opts) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const store = new LocalStore(getDbPath());

    try {
      const orgId = config.remote.orgId || "local";
      const repoId = config.remote.repoId || "local";

      if (!config.remote.url) {
        logger.fatal("No remote configured.");
        process.exit(EXIT_CONFIG_ERROR);
      }

      const client = new RemoteClient(config.remote.url, config.remote.apiKey);

      if (memoryId) {
        await diffSingleMemory(store, client, memoryId, orgId, repoId);
      } else {
        await diffAll(store, client, orgId, repoId, opts.stat);
      }
    } finally {
      store.close();
    }
  });

async function diffSingleMemory(
  store: LocalStore,
  client: RemoteClient,
  memoryId: string,
  orgId: string,
  repoId: string,
): Promise<void> {
  const fullId = memoryId.length < 36
    ? findFullId(store, memoryId, orgId, repoId)
    : memoryId;

  if (!fullId) {
    logger.error(`memory '${memoryId}' not found`);
    process.exit(EXIT_ERROR);
  }

  const localMem = store.getById(fullId);

  let remoteMem = null;
  try {
    const response = await client.recall({
      orgId,
      repoId,
      query: fullId,
      k: 1,
    });
    remoteMem = response.results.find((r) => r.id === fullId);
  } catch {
    logger.warn("Could not fetch from remote");
  }

  if (!localMem && !remoteMem) {
    logger.error(`memory '${memoryId}' not found locally or remotely`);
    process.exit(EXIT_ERROR);
  }

  if (isJsonMode()) {
    outputJson({
      memoryId: fullId,
      local: localMem ? { text: localMem.text, status: localMem.status } : null,
      remote: remoteMem ? { text: remoteMem.text, status: remoteMem.status } : null,
      identical: localMem && remoteMem ? localMem.text === remoteMem.text : false,
    });
    return;
  }

  logger.info(`diff ${fullId.slice(0, 8)}...`);
  logger.info("---");

  if (!localMem) {
    logger.info("(not in local)");
    logger.info("+ " + remoteMem!.text.split("\n").join("\n+ "));
    return;
  }

  if (!remoteMem) {
    logger.info("(not in remote)");
    logger.info("+ " + localMem.text.split("\n").join("\n+ "));
    return;
  }

  if (localMem.text === remoteMem.text) {
    logger.info("No differences");
    return;
  }

  const localLines = localMem.text.split("\n");
  const remoteLines = remoteMem.text.split("\n");

  logger.info("--- local");
  logger.info("+++ remote");
  logger.info("");

  for (let i = 0; i < Math.max(localLines.length, remoteLines.length); i++) {
    const localLine = localLines[i];
    const remoteLine = remoteLines[i];

    if (localLine === remoteLine) {
      logger.info(`  ${localLine ?? ""}`);
    } else if (localLine && !remoteLine) {
      logger.info(`- ${localLine}`);
    } else if (!localLine && remoteLine) {
      logger.info(`+ ${remoteLine}`);
    } else {
      logger.info(`- ${localLine}`);
      logger.info(`+ ${remoteLine}`);
    }
  }
}

async function diffAll(
  store: LocalStore,
  client: RemoteClient,
  orgId: string,
  repoId: string,
  statOnly: boolean,
): Promise<void> {
  const pendingPush = store.getPendingPush();
  const conflicts = store.getConflicts();

  let remoteOnlyCount = 0;
  try {
    const response = await client.recall({ orgId, repoId, query: "*", k: 1000 });
    for (const remoteMem of response.results) {
      const localMem = store.getById(remoteMem.id);
      if (!localMem) {
        remoteOnlyCount++;
      }
    }
  } catch {
    logger.warn("Could not fetch remote memories for full diff");
  }

  if (pendingPush.length === 0 && conflicts.length === 0 && remoteOnlyCount === 0) {
    if (isJsonMode()) {
      outputJson({ pendingPush: 0, conflicts: 0, remoteOnly: 0, total: 0 });
      return;
    }
    logger.info("No differences");
    return;
  }

  if (isJsonMode()) {
    outputJson({
      pendingPush: pendingPush.length,
      conflicts: conflicts.length,
      remoteOnly: remoteOnlyCount,
      total: pendingPush.length + conflicts.length + remoteOnlyCount,
    });
    return;
  }

  if (statOnly) {
    logger.info(`${pendingPush.length} memories to push`);
    logger.info(`${conflicts.length} conflicts`);
    if (remoteOnlyCount > 0) {
      logger.info(`${remoteOnlyCount} remote-only memories (use 'hippo pull')`);
    }
    return;
  }

  if (pendingPush.length > 0) {
    logger.info("Changes to push:");
    logger.info("");
    for (const { memory } of pendingPush) {
      logger.info(`  + ${memory.id.slice(0, 8)}... "${truncate(memory.text, 50)}"`);
    }
    logger.info("");
  }

  if (conflicts.length > 0) {
    logger.info("Conflicts:");
    logger.info("");
    for (const { memory, syncState } of conflicts) {
      logger.info(`  ! ${memory.id.slice(0, 8)}... local:v${syncState.localVersion} remote:v${syncState.remoteVersion ?? "?"}`);
      logger.info(`    "${truncate(memory.text, 60)}"`);
    }
    logger.info("");
  }

  if (remoteOnlyCount > 0) {
    logger.info(`${remoteOnlyCount} remote-only memories (run 'hippo pull' to fetch)`);
    logger.info("");
  }

  logger.info(`Total: ${pendingPush.length + conflicts.length + remoteOnlyCount} differences`);
}

function findFullId(store: LocalStore, partialId: string, orgId: string, repoId: string): string | null {
  const memories = store.list({ orgId, repoId, limit: 1000 });
  const match = memories.find((m) => m.id.startsWith(partialId));
  return match?.id ?? null;
}
