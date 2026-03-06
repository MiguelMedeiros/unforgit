import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";
import { recallCommand } from "./commands/recall.js";
import { promoteCommand } from "./commands/promote.js";
import { consolidateCommand } from "./commands/consolidate.js";
import { deprecateCommand } from "./commands/deprecate.js";
import { supersedeCommand } from "./commands/supersede.js";
import { deleteCommand, restoreCommand } from "./commands/delete.js";
import { webCommand } from "./commands/web.js";
import { linkCommand, unlinkCommand, linksCommand } from "./commands/link.js";
import {
  mergeCommand,
  remergeCommand,
  similarCommand,
  historyCommand,
} from "./commands/merge.js";
import { autoConsolidateCommand } from "./commands/auto-consolidate.js";
import { unconsolidateCommand } from "./commands/unconsolidate.js";
import { statusCommand } from "./commands/status.js";
import { pushCommand } from "./commands/push.js";
import { pullCommand } from "./commands/pull.js";
import { remoteCommand } from "./commands/remote.js";
import { logCommand } from "./commands/log.js";
import { branchCommand, checkoutCommand } from "./commands/branch.js";
import { diffCommand } from "./commands/diff.js";
import { keysCommand } from "./commands/keys.js";
import { authCommand } from "./commands/auth.js";
import { configCommand } from "./commands/config.js";
import { embeddingsCommand } from "./commands/embeddings.js";
import { createRequire } from "node:module";
import { setVerbosity } from "./logger.js";
import { EXIT_ERROR, EXIT_SIGINT, EXIT_SIGTERM } from "./exit-codes.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json");

const cleanupHandlers: Array<() => void> = [];
export function registerCleanup(fn: () => void) {
  cleanupHandlers.push(fn);
}
export function unregisterCleanup(fn: () => void) {
  const idx = cleanupHandlers.indexOf(fn);
  if (idx >= 0) cleanupHandlers.splice(idx, 1);
}

function runCleanup() {
  for (const fn of cleanupHandlers) {
    try { fn(); } catch { /* best-effort */ }
  }
}

process.on("SIGINT", () => { runCleanup(); process.exit(EXIT_SIGINT); });
process.on("SIGTERM", () => { runCleanup(); process.exit(EXIT_SIGTERM); });
process.on("uncaughtException", (err) => {
  console.error(`fatal: ${err.message}`);
  runCleanup();
  process.exit(EXIT_ERROR);
});
process.on("unhandledRejection", (err) => {
  console.error(`fatal: ${err instanceof Error ? err.message : err}`);
  runCleanup();
  process.exit(EXIT_ERROR);
});

const program = new Command();

program
  .name("hippo")
  .description("Hippocampus — repository memory for agents and developers")
  .version(pkg.version)
  .option("--verbose", "Enable verbose output")
  .option("--quiet", "Suppress non-essential output")
  .hook("preAction", () => {
    const opts = program.opts();
    if (opts.quiet) setVerbosity(0);
    else if (opts.verbose) setVerbosity(2);
  });

program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(recallCommand);
program.addCommand(promoteCommand);
program.addCommand(consolidateCommand);
program.addCommand(deprecateCommand);
program.addCommand(supersedeCommand);
program.addCommand(webCommand);
program.addCommand(linkCommand);
program.addCommand(unlinkCommand);
program.addCommand(linksCommand);
program.addCommand(mergeCommand);
program.addCommand(remergeCommand);
program.addCommand(similarCommand);
program.addCommand(historyCommand);
program.addCommand(deleteCommand);
program.addCommand(restoreCommand);
program.addCommand(autoConsolidateCommand);
program.addCommand(unconsolidateCommand);
program.addCommand(statusCommand);
program.addCommand(pushCommand);
program.addCommand(pullCommand);
program.addCommand(remoteCommand);
program.addCommand(logCommand);
program.addCommand(branchCommand);
program.addCommand(checkoutCommand);
program.addCommand(diffCommand);
program.addCommand(keysCommand);
program.addCommand(authCommand);
program.addCommand(configCommand);
program.addCommand(embeddingsCommand);

program.parseAsync().catch((err) => {
  console.error(`fatal: ${err instanceof Error ? err.message : err}`);
  runCleanup();
  process.exit(EXIT_ERROR);
});
