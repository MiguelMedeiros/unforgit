import fs from "node:fs";
import { Command } from "commander";
import {
  getHippoDir,
  getConfigPath,
  getDbPath,
  defaultConfig,
  saveConfig,
  isInitialized,
  detectGitInfo,
} from "../config.js";
import { LocalStore } from "../../db/local.js";

export const initCommand = new Command("init")
  .description("Initialize Hippocampus in the current repository")
  .option("--org-id <orgId>", "Override auto-detected organization ID")
  .option("--repo-id <repoId>", "Override auto-detected repository ID")
  .option("--remote-url <url>", "Remote API URL", "http://localhost:3737")
  .action((opts) => {
    const cwd = process.cwd();

    if (isInitialized(cwd)) {
      console.log("Hippocampus is already initialized in this directory.");
      return;
    }

    const hippoDir = getHippoDir(cwd);
    fs.mkdirSync(hippoDir, { recursive: true });

    const git = detectGitInfo(cwd);
    const config = defaultConfig();

    config.remote.orgId = opts.orgId ?? git.orgId;
    config.remote.repoId = opts.repoId ?? git.repoId;
    if (opts.remoteUrl) config.remote.url = opts.remoteUrl;

    saveConfig(config, cwd);

    const store = new LocalStore(getDbPath(cwd));
    store.close();

    console.log(`Initialized Hippocampus at ${hippoDir}`);
    console.log(`  Config: ${getConfigPath(cwd)}`);
    console.log(`  Local DB: ${getDbPath(cwd)}`);

    if (config.remote.orgId || config.remote.repoId) {
      console.log(`  Org: ${config.remote.orgId}`);
      console.log(`  Repo: ${config.remote.repoId}`);
      if (!opts.orgId && !opts.repoId) {
        console.log("  (auto-detected from git remote)");
      }
    } else {
      console.log(
        "\nTip: Set org_id and repo_id in .hippocampus/hippo.yaml or add a git remote.",
      );
    }
  });
