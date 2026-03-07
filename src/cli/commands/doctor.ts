import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized, getConfigPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { maskKey, isJsonMode, outputJson } from "../utils.js";
import fs from "node:fs";

interface DiagnosticResult {
  check: string;
  status: "ok" | "warn" | "error";
  message: string;
}

export const doctorCommand = new Command("doctor")
  .description("Check system health and diagnose common issues")
  .action(async () => {
    const results: DiagnosticResult[] = [];

    if (!isInitialized()) {
      results.push({
        check: "initialization",
        status: "error",
        message: "Not a hippocampus repository. Run 'hippo init' first.",
      });
      if (isJsonMode()) {
        outputJson({ results });
        return;
      }
      printResults(results);
      process.exit(EXIT_CONFIG_ERROR);
    }

    results.push({ check: "initialization", status: "ok", message: "Repository initialized" });

    const configPath = getConfigPath();
    try {
      const config = loadConfig();
      results.push({ check: "config", status: "ok", message: `Valid config at ${configPath}` });

      if (process.platform !== "win32") {
        try {
          const stat = fs.statSync(configPath);
          const mode = stat.mode & 0o777;
          if (mode & 0o044) {
            results.push({
              check: "config-permissions",
              status: "warn",
              message: `Config readable by others (mode ${mode.toString(8)}). Run: chmod 600 ${configPath}`,
            });
          } else {
            results.push({ check: "config-permissions", status: "ok", message: "Config file permissions are secure" });
          }
        } catch {
          results.push({ check: "config-permissions", status: "warn", message: "Could not check config file permissions" });
        }
      }

      const store = new LocalStore(getDbPath());
      try {
        const orgId = config.remote.orgId || "local";
        const repoId = config.remote.repoId || "local";

        store.list({ orgId, repoId, limit: 1 });
        results.push({ check: "local-db", status: "ok", message: "SQLite database is accessible" });

        const stats = store.getEmbeddingStats(orgId, repoId);
        if (stats.total === 0) {
          results.push({ check: "embeddings", status: "ok", message: "No memories yet" });
        } else if (stats.withoutEmbedding === 0) {
          results.push({ check: "embeddings", status: "ok", message: `All ${stats.total} memories have embeddings` });
        } else {
          const pct = ((stats.withEmbedding / stats.total) * 100).toFixed(1);
          results.push({
            check: "embeddings",
            status: "warn",
            message: `${stats.withoutEmbedding}/${stats.total} memories lack embeddings (${pct}% coverage). Run 'hippo embeddings backfill'`,
          });
        }

        const pendingPush = store.getPendingPush();
        const conflicts = store.getConflicts();
        if (conflicts.length > 0) {
          results.push({
            check: "sync",
            status: "warn",
            message: `${conflicts.length} sync conflict(s) need resolution`,
          });
        } else if (pendingPush.length > 0) {
          results.push({
            check: "sync",
            status: "ok",
            message: `${pendingPush.length} memory(s) pending push`,
          });
        } else {
          results.push({ check: "sync", status: "ok", message: "Sync state clean" });
        }
      } finally {
        store.close();
      }

      const apiKey = config.remote.apiKey || process.env.HIPPO_API_KEY;
      if (config.remote.url) {
        if (!apiKey) {
          results.push({
            check: "auth",
            status: "warn",
            message: "No API key configured. Run 'hippo auth set <key>' or set HIPPO_API_KEY",
          });
        } else {
          results.push({
            check: "auth",
            status: "ok",
            message: `API key configured: ${maskKey(apiKey)}`,
          });
        }

        try {
          const res = await fetch(`${config.remote.url}/health`);
          if (res.ok) {
            results.push({ check: "remote", status: "ok", message: `Server reachable at ${config.remote.url}` });

            if (apiKey) {
              const client = new RemoteClient(config.remote.url, apiKey);
              try {
                await client.listApiKeys();
                results.push({ check: "remote-auth", status: "ok", message: "API key is valid" });
              } catch {
                results.push({ check: "remote-auth", status: "error", message: "API key is invalid or expired" });
              }
            }
          } else {
            results.push({
              check: "remote",
              status: "error",
              message: `Server returned HTTP ${res.status}`,
            });
          }
        } catch (err) {
          results.push({
            check: "remote",
            status: "error",
            message: `Cannot connect to ${config.remote.url}: ${err instanceof Error ? err.message : err}`,
          });
        }
      } else {
        results.push({ check: "remote", status: "warn", message: "No remote URL configured" });
      }

      const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
      if (openaiKey) {
        results.push({ check: "openai", status: "ok", message: `OpenAI API key configured: ${maskKey(openaiKey)}` });
      } else {
        results.push({
          check: "openai",
          status: "warn",
          message: "No OpenAI API key. Auto-consolidation and embeddings backfill require it.",
        });
      }
    } catch (err) {
      results.push({
        check: "config",
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }

    if (isJsonMode()) {
      outputJson({ results });
      return;
    }

    printResults(results);
  });

function printResults(results: DiagnosticResult[]): void {
  const icons = { ok: "[ok]", warn: "[!!]", error: "[ERR]" };

  logger.info("Hippocampus Doctor\n");

  for (const r of results) {
    const icon = icons[r.status];
    logger.info(`  ${icon} ${r.check}: ${r.message}`);
  }

  const errors = results.filter((r) => r.status === "error").length;
  const warnings = results.filter((r) => r.status === "warn").length;

  logger.info("");
  if (errors > 0) {
    logger.info(`${errors} error(s), ${warnings} warning(s)`);
  } else if (warnings > 0) {
    logger.info(`No errors, ${warnings} warning(s)`);
  } else {
    logger.info("All checks passed!");
  }
}
