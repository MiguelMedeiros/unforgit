import fs from "node:fs";
import { Command } from "commander";
import { logger } from "../logger.js";
import {
  getDataDir,
  getConfigPath,
  getDbPath,
  defaultConfig,
  saveConfig,
  isInitialized,
  detectGitInfo,
} from "@unforgit/config";
import { LocalStore } from "@unforgit/db";
import {
  detectIdes,
  setupIdes,
  logIdeResults,
  parseIdeOption,
  ALL_IDE_NAMES,
  type IdeName,
} from "../ide-integration.js";

export const initCommand = new Command("init")
  .description("Initialize Unforgit in the current repository")
  .option("--org-id <orgId>", "Override auto-detected organization ID")
  .option("--repo-id <repoId>", "Override auto-detected repository ID")
  .option("--remote-url <url>", "Remote API URL", "http://localhost:3737")
  .option(
    "--ide <ides>",
    `IDE integrations to set up: ${ALL_IDE_NAMES.join(", ")}, all (default: auto-detect)`,
  )
  .option("--no-ide", "Skip all IDE integrations")
  .option("--no-cursor-rule", "Skip IDE integrations (deprecated, use --no-ide)")
  .action((opts) => {
    const cwd = process.cwd();

    if (isInitialized(cwd)) {
      logger.info("Unforgit is already initialized in this directory.");
      return;
    }

    const dataDir = getDataDir(cwd);
    fs.mkdirSync(dataDir, { recursive: true });

    const git = detectGitInfo(cwd);
    const config = defaultConfig();

    config.remote.orgId = opts.orgId ?? git.orgId;
    config.remote.repoId = opts.repoId ?? git.repoId;
    if (opts.remoteUrl) config.remote.url = opts.remoteUrl;

    saveConfig(config, cwd);

    const store = new LocalStore(getDbPath(cwd));
    store.close();

    logger.info(`Initialized Unforgit at ${dataDir}`);
    logger.info(`  Config: ${getConfigPath(cwd)}`);
    logger.info(`  Local DB: ${getDbPath(cwd)}`);

    if (config.remote.orgId || config.remote.repoId) {
      logger.info(`  Org: ${config.remote.orgId}`);
      logger.info(`  Repo: ${config.remote.repoId}`);
      if (!opts.orgId && !opts.repoId) {
        logger.info("  (auto-detected from git remote)");
      }
    } else {
      logger.info(
        "\nTip: Set org_id and repo_id in .unforgit/unforgit.yaml or add a git remote.",
      );
    }

    const skipIde = opts.ide === false || opts.cursorRule === false;

    if (!skipIde) {
      let ides: IdeName[];

      if (opts.ide && typeof opts.ide === "string") {
        ides = parseIdeOption(opts.ide);
      } else {
        ides = detectIdes(cwd);
        if (ides.length === 0) {
          ides = ["cursor"];
          logger.info(
            "\n  No IDE detected, defaulting to Cursor. Use --ide to specify.",
          );
        } else {
          logger.info(
            `\n  Auto-detected IDEs: ${ides.join(", ")}`,
          );
        }
      }

      const results = setupIdes(cwd, ides);
      logIdeResults(results);
    } else {
      logger.info("\n  IDE integration: skipped");
    }
  });
