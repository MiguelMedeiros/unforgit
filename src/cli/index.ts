import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";
import { recallCommand } from "./commands/recall.js";
import { promoteCommand } from "./commands/promote.js";
import { consolidateCommand } from "./commands/consolidate.js";
import { deprecateCommand } from "./commands/deprecate.js";
import { supersedeCommand } from "./commands/supersede.js";

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

program.parse();
