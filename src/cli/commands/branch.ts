import { Command } from "commander";
import { getConfigPath, isInitialized } from "../config.js";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";
import fs from "node:fs";
import YAML from "yaml";
import type { HippoConfig } from "../../core/types.js";

export const branchCommand = new Command("branch")
  .description("List, create, or delete branches")
  .argument("[branchName]", "Name of branch to create")
  .option("-d, --delete", "Delete a branch")
  .option("-a, --all", "List all branches")
  .action((branchName, opts) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const currentBranch = config.currentBranch || "main";
    const branches = config.branches || ["main"];

    if (!branchName) {
      for (const branch of branches) {
        const prefix = branch === currentBranch ? "* " : "  ";
        const color = branch === currentBranch ? "\x1b[32m" : "";
        const reset = branch === currentBranch ? "\x1b[0m" : "";
        logger.info(`${prefix}${color}${branch}${reset}`);
      }
      return;
    }

    if (opts.delete) {
      if (branchName === "main") {
        logger.error("Cannot delete branch 'main'");
        process.exit(EXIT_ERROR);
      }
      if (branchName === currentBranch) {
        logger.error(`Cannot delete branch '${branchName}' while checked out.`);
        logger.error("Use 'hippo checkout main' first.");
        process.exit(EXIT_ERROR);
      }
      if (!branches.includes(branchName)) {
        logger.error(`branch '${branchName}' not found.`);
        process.exit(EXIT_ERROR);
      }

      const newBranches = branches.filter((b: string) => b !== branchName);
      saveConfig({ ...config, branches: newBranches });
      logger.info(`Deleted branch ${branchName}`);
      return;
    }

    if (branches.includes(branchName)) {
      logger.fatal(`A branch named '${branchName}' already exists.`);
      process.exit(EXIT_ERROR);
    }

    const newBranches = [...branches, branchName];
    saveConfig({ ...config, branches: newBranches });
    logger.info(`Created branch '${branchName}'`);
  });

export const checkoutCommand = new Command("checkout")
  .description("Switch branches")
  .argument("<branchName>", "Branch name to switch to")
  .option("-b", "Create and checkout a new branch")
  .action((branchName, opts) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const currentBranch = config.currentBranch || "main";
    const branches = config.branches || ["main"];

    if (opts.b) {
      if (branches.includes(branchName)) {
        logger.fatal(`A branch named '${branchName}' already exists.`);
        process.exit(EXIT_ERROR);
      }

      const newBranches = [...branches, branchName];
      saveConfig({ ...config, branches: newBranches, currentBranch: branchName });
      logger.info(`Switched to a new branch '${branchName}'`);
      return;
    }

    if (!branches.includes(branchName)) {
      logger.error(`pathspec '${branchName}' did not match any branch.`);
      process.exit(EXIT_ERROR);
    }

    if (branchName === currentBranch) {
      logger.info(`Already on '${branchName}'`);
      return;
    }

    saveConfig({ ...config, currentBranch: branchName });
    logger.info(`Switched to branch '${branchName}'`);
  });

interface ExtendedConfig extends HippoConfig {
  currentBranch?: string;
  branches?: string[];
}

function loadConfig(): ExtendedConfig {
  const configPath = getConfigPath();
  const raw = fs.readFileSync(configPath, "utf-8");
  return YAML.parse(raw) as ExtendedConfig;
}

function saveConfig(config: ExtendedConfig): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");
}
