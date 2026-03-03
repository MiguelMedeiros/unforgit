import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";

export const diffCommand = new Command("diff")
  .description("Show differences between local and remote memories")
  .argument("[memoryId]", "Specific memory ID to diff")
  .option("--stat", "Show only statistics")
  .action(async (memoryId, opts) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadConfig();
    const store = new LocalStore(getDbPath());
    const orgId = config.remote.orgId || "local";
    const repoId = config.remote.repoId || "local";

    if (!config.remote.url) {
      console.error("fatal: No remote configured.");
      store.close();
      process.exit(1);
    }

    const client = new RemoteClient(config.remote.url, config.remote.apiKey);

    if (memoryId) {
      await diffSingleMemory(store, client, memoryId, orgId, repoId);
    } else {
      await diffAll(store, client, orgId, repoId, opts.stat);
    }

    store.close();
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
    console.error(`error: memory '${memoryId}' not found`);
    process.exit(1);
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
    console.log("Could not fetch from remote");
  }

  if (!localMem && !remoteMem) {
    console.error(`error: memory '${memoryId}' not found locally or remotely`);
    process.exit(1);
  }

  console.log(`diff ${fullId.slice(0, 8)}...`);
  console.log("---");

  if (!localMem) {
    console.log("\x1b[31m(not in local)\x1b[0m");
    console.log("\x1b[32m+ " + remoteMem!.text.split("\n").join("\n+ ") + "\x1b[0m");
    return;
  }

  if (!remoteMem) {
    console.log("\x1b[32m(not in remote)\x1b[0m");
    console.log("\x1b[32m+ " + localMem.text.split("\n").join("\n+ ") + "\x1b[0m");
    return;
  }

  if (localMem.text === remoteMem.text) {
    console.log("No differences");
    return;
  }

  const localLines = localMem.text.split("\n");
  const remoteLines = remoteMem.text.split("\n");

  console.log("\x1b[31m--- local\x1b[0m");
  console.log("\x1b[32m+++ remote\x1b[0m");
  console.log();

  for (let i = 0; i < Math.max(localLines.length, remoteLines.length); i++) {
    const localLine = localLines[i];
    const remoteLine = remoteLines[i];

    if (localLine === remoteLine) {
      console.log(`  ${localLine ?? ""}`);
    } else if (localLine && !remoteLine) {
      console.log(`\x1b[31m- ${localLine}\x1b[0m`);
    } else if (!localLine && remoteLine) {
      console.log(`\x1b[32m+ ${remoteLine}\x1b[0m`);
    } else {
      console.log(`\x1b[31m- ${localLine}\x1b[0m`);
      console.log(`\x1b[32m+ ${remoteLine}\x1b[0m`);
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

  if (pendingPush.length === 0 && conflicts.length === 0) {
    console.log("No differences");
    return;
  }

  if (statOnly) {
    console.log(`${pendingPush.length} memories to push`);
    console.log(`${conflicts.length} conflicts`);
    return;
  }

  if (pendingPush.length > 0) {
    console.log("Changes to push:");
    console.log();
    for (const { memory } of pendingPush) {
      console.log(`\x1b[32m+ ${memory.id.slice(0, 8)}...\x1b[0m "${truncate(memory.text, 50)}"`);
    }
    console.log();
  }

  if (conflicts.length > 0) {
    console.log("Conflicts:");
    console.log();
    for (const { memory, syncState } of conflicts) {
      console.log(`\x1b[33m! ${memory.id.slice(0, 8)}...\x1b[0m local:v${syncState.localVersion} remote:v${syncState.remoteVersion ?? "?"}`);
      console.log(`  "${truncate(memory.text, 60)}"`);
    }
    console.log();
  }

  console.log(`Total: ${pendingPush.length + conflicts.length} differences`);
}

function findFullId(store: LocalStore, partialId: string, orgId: string, repoId: string): string | null {
  const memories = store.list({ orgId, repoId, limit: 1000 });
  const match = memories.find((m) => m.id.startsWith(partialId));
  return match?.id ?? null;
}

function truncate(text: string, maxLength: number): string {
  const singleLine = text.replace(/\n/g, " ").trim();
  if (singleLine.length <= maxLength) return singleLine;
  return singleLine.slice(0, maxLength - 3) + "...";
}
