import { Command } from "commander";
import { getConfigPath, isInitialized } from "../config.js";
import fs from "node:fs";
import YAML from "yaml";
import type { HippoConfig, HippoConfigV2 } from "../../core/types.js";

export const branchCommand = new Command("branch")
  .description("List, create, or delete branches")
  .argument("[branchName]", "Name of branch to create")
  .option("-d, --delete", "Delete a branch")
  .option("-a, --all", "List all branches")
  .action((branchName, opts) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadConfig();
    const currentBranch = config.currentBranch || "main";
    const branches = config.branches || ["main"];

    if (!branchName) {
      for (const branch of branches) {
        const prefix = branch === currentBranch ? "* " : "  ";
        const color = branch === currentBranch ? "\x1b[32m" : "";
        const reset = branch === currentBranch ? "\x1b[0m" : "";
        console.log(`${prefix}${color}${branch}${reset}`);
      }
      return;
    }

    if (opts.delete) {
      if (branchName === "main") {
        console.error("error: Cannot delete branch 'main'");
        process.exit(1);
      }
      if (branchName === currentBranch) {
        console.error(`error: Cannot delete branch '${branchName}' while checked out.`);
        console.error(`Use 'hippo checkout main' first.`);
        process.exit(1);
      }
      if (!branches.includes(branchName)) {
        console.error(`error: branch '${branchName}' not found.`);
        process.exit(1);
      }

      const newBranches = branches.filter((b: string) => b !== branchName);
      saveConfig({ ...config, branches: newBranches });
      console.log(`Deleted branch ${branchName}`);
      return;
    }

    if (branches.includes(branchName)) {
      console.error(`fatal: A branch named '${branchName}' already exists.`);
      process.exit(1);
    }

    const newBranches = [...branches, branchName];
    saveConfig({ ...config, branches: newBranches });
    console.log(`Created branch '${branchName}'`);
  });

export const checkoutCommand = new Command("checkout")
  .description("Switch branches")
  .argument("<branchName>", "Branch name to switch to")
  .option("-b", "Create and checkout a new branch")
  .action((branchName, opts) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadConfig();
    const currentBranch = config.currentBranch || "main";
    const branches = config.branches || ["main"];

    if (opts.b) {
      if (branches.includes(branchName)) {
        console.error(`fatal: A branch named '${branchName}' already exists.`);
        process.exit(1);
      }

      const newBranches = [...branches, branchName];
      saveConfig({ ...config, branches: newBranches, currentBranch: branchName });
      console.log(`Switched to a new branch '${branchName}'`);
      return;
    }

    if (!branches.includes(branchName)) {
      console.error(`error: pathspec '${branchName}' did not match any branch.`);
      process.exit(1);
    }

    if (branchName === currentBranch) {
      console.log(`Already on '${branchName}'`);
      return;
    }

    saveConfig({ ...config, currentBranch: branchName });
    console.log(`Switched to branch '${branchName}'`);
  });

interface ExtendedConfig extends HippoConfig, Partial<HippoConfigV2> {
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
