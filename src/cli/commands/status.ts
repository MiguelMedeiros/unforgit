import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import { LocalStore } from "../../db/local.js";

export const statusCommand = new Command("status")
  .description("Show the working tree status (pending sync state)")
  .option("-s, --short", "Give the output in short format")
  .action((opts) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository (or any of the parent directories)");
      console.error("Run 'hippo init' to initialize.");
      process.exit(1);
    }

    const config = loadConfig();
    const store = new LocalStore(getDbPath());
    const orgId = config.remote.orgId || "local";
    const repoId = config.remote.repoId || "local";

    const branch = "main";
    const remoteUrl = config.remote.url;
    const remoteName = "origin";

    const pendingPush = store.getPendingPush();
    const conflicts = store.getConflicts();
    const untracked = store.getUntrackedMemories(orgId, repoId);
    const summary = store.getSyncSummary(orgId, repoId);

    if (opts.short) {
      printShortStatus(pendingPush, conflicts, untracked);
    } else {
      printLongStatus(branch, remoteName, remoteUrl, pendingPush, conflicts, untracked, summary);
    }

    store.close();
  });

function printShortStatus(
  pendingPush: Array<{ memory: { id: string; text: string }; syncState: { syncStatus: string } }>,
  conflicts: Array<{ memory: { id: string; text: string } }>,
  untracked: Array<{ id: string; text: string }>,
): void {
  for (const { memory } of pendingPush) {
    console.log(`M  ${memory.id.slice(0, 8)} ${truncate(memory.text, 50)}`);
  }
  for (const { memory } of conflicts) {
    console.log(`C  ${memory.id.slice(0, 8)} ${truncate(memory.text, 50)}`);
  }
  for (const memory of untracked) {
    console.log(`?? ${memory.id.slice(0, 8)} ${truncate(memory.text, 50)}`);
  }
}

function printLongStatus(
  branch: string,
  remoteName: string,
  remoteUrl: string,
  pendingPush: Array<{ memory: { id: string; text: string; status: string }; syncState: { syncStatus: string } }>,
  conflicts: Array<{ memory: { id: string; text: string } }>,
  untracked: Array<{ id: string; text: string }>,
  summary: { synced: number; pendingPush: number; pendingPull: number; conflicts: number },
): void {
  console.log(`On branch ${branch}`);
  
  if (remoteUrl) {
    console.log(`Your remote is '${remoteName}' at ${remoteUrl}`);
  } else {
    console.log("No remote configured. Use 'hippo remote add origin <url>' to add one.");
  }
  console.log();

  if (pendingPush.length === 0 && conflicts.length === 0 && untracked.length === 0) {
    console.log("Nothing to push, working tree clean");
    if (summary.synced > 0) {
      console.log(`  ${summary.synced} memories synced with remote`);
    }
    return;
  }

  if (pendingPush.length > 0) {
    console.log("Changes to be pushed:");
    console.log('  (use "hippo push" to sync with remote)');
    console.log();
    for (const { memory } of pendingPush) {
      const action = memory.status === "active" ? "new memory" : "modified";
      console.log(`        ${action}:   ${memory.id.slice(0, 8)}... "${truncate(memory.text, 40)}"`);
    }
    console.log();
  }

  if (conflicts.length > 0) {
    console.log("Conflicts:");
    console.log('  (use "hippo push --force" to overwrite remote or "hippo pull --force" to accept remote)');
    console.log();
    for (const { memory } of conflicts) {
      console.log(`        conflict:  ${memory.id.slice(0, 8)}... "${truncate(memory.text, 40)}"`);
    }
    console.log();
  }

  if (untracked.length > 0) {
    console.log("Untracked memories:");
    console.log('  (these memories were created before sync tracking was enabled)');
    console.log('  (use "hippo push" to sync them)');
    console.log();
    for (const memory of untracked) {
      console.log(`        ${memory.id.slice(0, 8)}... "${truncate(memory.text, 40)}"`);
    }
    console.log();
  }

  const total = pendingPush.length + conflicts.length + untracked.length;
  console.log(`${total} change(s) pending`);
}

function truncate(text: string, maxLength: number): string {
  const singleLine = text.replace(/\n/g, " ").trim();
  if (singleLine.length <= maxLength) return singleLine;
  return singleLine.slice(0, maxLength - 3) + "...";
}
