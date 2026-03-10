import fs from "node:fs";
import path from "node:path";
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
import { CURSOR_RULE_CONTENT } from "../cursor-rule.js";

export const initCommand = new Command("init")
  .description("Initialize Unforgit in the current repository")
  .option("--org-id <orgId>", "Override auto-detected organization ID")
  .option("--repo-id <repoId>", "Override auto-detected repository ID")
  .option("--remote-url <url>", "Remote API URL", "http://localhost:3737")
  .option("--no-cursor-rule", "Skip creating Cursor IDE rule")
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

    if (opts.cursorRule !== false) {
      const cursorDir = path.join(cwd, ".cursor");

      const rulesDir = path.join(cursorDir, "rules");
      const rulePath = path.join(rulesDir, "unforgit-memory.mdc");
      if (!fs.existsSync(rulePath)) {
        fs.mkdirSync(rulesDir, { recursive: true });
        fs.writeFileSync(rulePath, CURSOR_RULE_CONTENT, "utf-8");
        logger.info(`  Cursor rule: ${rulePath}`);
      } else {
        logger.info(`  Cursor rule: already exists`);
      }

      const mcpPath = path.join(cursorDir, "mcp.json");
      if (!fs.existsSync(mcpPath)) {
        const mcpConfig = {
          mcpServers: {
            unforgit: {
              command: "unforgit-mcp",
              args: [],
            },
          },
        };
        fs.mkdirSync(cursorDir, { recursive: true });
        fs.writeFileSync(
          mcpPath,
          JSON.stringify(mcpConfig, null, 2) + "\n",
          "utf-8",
        );
        logger.info(`  MCP config: ${mcpPath}`);
      } else {
        const existing = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
        if (!existing.mcpServers?.unforgit) {
          existing.mcpServers = existing.mcpServers || {};
          existing.mcpServers.unforgit = {
            command: "unforgit-mcp",
            args: [],
          };
          fs.writeFileSync(
            mcpPath,
            JSON.stringify(existing, null, 2) + "\n",
            "utf-8",
          );
          logger.info(`  MCP config: added unforgit to ${mcpPath}`);
        } else {
          logger.info(`  MCP config: already configured`);
        }
      }
    }
  });
