import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";
import { truncate } from "../utils.js";

export const diffCommand = new Command("diff")
  .description("Show differences between local and remote memories")
  .argument("[memoryId]", "Specific memory ID to diff")
  .option("--stat", "Show only statistics")
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

  logger.info(`diff ${fullId.slice(0, 8)}...`);
  logger.info("---");

  if (!localMem) {
    logger.info("\x1b[31m(not in local)\x1b[0m");
    logger.info("\x1b[32m+ " + remoteMem!.text.split("\n").join("\n+ ") + "\x1b[0m");
    return;
  }

  if (!remoteMem) {
    logger.info("\x1b[32m(not in remote)\x1b[0m");
    logger.info("\x1b[32m+ " + localMem.text.split("\n").join("\n+ ") + "\x1b[0m");
    return;
  }

  if (localMem.text === remoteMem.text) {
    logger.info("No differences");
    return;
  }

  const localLines = localMem.text.split("\n");
  const remoteLines = remoteMem.text.split("\n");

  logger.info("\x1b[31m--- local\x1b[0m");
  logger.info("\x1b[32m+++ remote\x1b[0m");
  logger.info("");

  for (let i = 0; i < Math.max(localLines.length, remoteLines.length); i++) {
    const localLine = localLines[i];
    const remoteLine = remoteLines[i];

    if (localLine === remoteLine) {
      logger.info(`  ${localLine ?? ""}`);
    } else if (localLine && !remoteLine) {
      logger.info(`\x1b[31m- ${localLine}\x1b[0m`);
    } else if (!localLine && remoteLine) {
      logger.info(`\x1b[32m+ ${remoteLine}\x1b[0m`);
    } else {
      logger.info(`\x1b[31m- ${localLine}\x1b[0m`);
      logger.info(`\x1b[32m+ ${remoteLine}\x1b[0m`);
    }
  }
}

async function diffAll(
  store: LocalStore,
  _client: RemoteClient,
  _orgId: string,
  _repoId: string,
  statOnly: boolean,
): Promise<void> {
  const pendingPush = store.getPendingPush();
  const conflicts = store.getConflicts();

  if (pendingPush.length === 0 && conflicts.length === 0) {
    logger.info("No differences");
    return;
  }

  if (statOnly) {
    logger.info(`${pendingPush.length} memories to push`);
    logger.info(`${conflicts.length} conflicts`);
    return;
  }

  if (pendingPush.length > 0) {
    logger.info("Changes to push:");
    logger.info("");
    for (const { memory } of pendingPush) {
      logger.info(`\x1b[32m+ ${memory.id.slice(0, 8)}...\x1b[0m "${truncate(memory.text, 50)}"`);
    }
    logger.info("");
  }

  if (conflicts.length > 0) {
    logger.info("Conflicts:");
    logger.info("");
    for (const { memory, syncState } of conflicts) {
      logger.info(`\x1b[33m! ${memory.id.slice(0, 8)}...\x1b[0m local:v${syncState.localVersion} remote:v${syncState.remoteVersion ?? "?"}`);
      logger.info(`  "${truncate(memory.text, 60)}"`);
    }
    logger.info("");
  }

  logger.info(`Total: ${pendingPush.length + conflicts.length} differences`);
}

function findFullId(store: LocalStore, partialId: string, orgId: string, repoId: string): string | null {
  const memories = store.list({ orgId, repoId, limit: 1000 });
  const match = memories.find((m) => m.id.startsWith(partialId));
  return match?.id ?? null;
}

