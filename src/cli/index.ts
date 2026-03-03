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

const program = new Command();

program
  .name("hippo")
  .description("Hippocampus — repository memory for agents and developers")
  .version("0.1.0");

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

program.parse();
