import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized, getConfigPath } from "unforgit-config";
import { LocalStore } from "unforgit-db";
import { RemoteClient } from "unforgit-config";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR, EXIT_ERROR } from "../exit-codes.js";
import { isJsonMode, outputJson } from "../utils.js";
import fs from "node:fs";
import YAML from "yaml";

interface DiagnosticResult {
  check: string;
  status: "ok" | "warn" | "error";
  message: string;
  fix?: string;
}

interface DoctorSummary {
  ok: number;
  warnings: number;
  errors: number;
}

export const doctorCommand = new Command("doctor")
  .description("Check system health and diagnose common issues")
  .action(async () => {
    const results: DiagnosticResult[] = [];

    if (!isInitialized()) {
      results.push({
        check: "initialization",
        status: "error",
        message: "Not an unforgit repository. Run 'unforgit init' first.",
        fix: "Run 'unforgit init' in the repository root.",
      });
      if (isJsonMode()) {
        outputJson(buildPayload(results));
        process.exit(EXIT_CONFIG_ERROR);
      }
      printResults(results);
      process.exit(EXIT_CONFIG_ERROR);
    }

    results.push({ check: "initialization", status: "ok", message: "Repository initialized" });

    const configPath = getConfigPath();
    try {
      const config = loadConfig();
      results.push({ check: "config", status: "ok", message: `Valid config at ${configPath}` });

      const deprecatedConfigKeys = findDeprecatedConfigKeys(configPath);
      if (deprecatedConfigKeys.length > 0) {
        results.push({
          check: "config-deprecated-secrets",
          status: "warn",
          message: `Deprecated secret-bearing config key(s): ${deprecatedConfigKeys.join(", ")}`,
          fix: "Move secrets to environment variables and remove them from unforgit.yaml.",
        });
      } else {
        results.push({ check: "config-deprecated-secrets", status: "ok", message: "No deprecated secret keys in config" });
      }

      if (process.platform !== "win32") {
        try {
          const stat = fs.statSync(configPath);
          const mode = stat.mode & 0o777;
          if (mode & 0o044) {
            results.push({
              check: "config-permissions",
              status: "warn",
              message: `Config readable by others (mode ${mode.toString(8)}). Run: chmod 600 ${configPath}`,
              fix: `Run 'chmod 600 ${configPath}'.`,
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

        const memoryStats = store.stats(orgId, repoId);
        results.push({
          check: "memory-stats",
          status: "ok",
          message: `${memoryStats.total} memories (${memoryStats.byType.episodic} episodic, ${memoryStats.byType.semantic} semantic, ${memoryStats.byType.procedural} procedural)`,
        });

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
            message: `${stats.withoutEmbedding}/${stats.total} memories lack embeddings (${pct}% coverage). Run 'unforgit embeddings backfill'`,
            fix: "Run 'unforgit embeddings backfill'.",
          });
        }

        const pendingPush = store.getPendingPush();
        const conflicts = store.getConflicts();
        const unsyncedTombstones = store.getUnsyncedTombstones(orgId, repoId);
        if (unsyncedTombstones.length > 0) {
          results.push({
            check: "tombstones",
            status: "warn",
            message: `${unsyncedTombstones.length} deleted memory tombstone(s) pending sync`,
            fix: "Run 'unforgit push' to sync deletions.",
          });
        } else {
          results.push({ check: "tombstones", status: "ok", message: "No deleted memory tombstones pending sync" });
        }

        if (conflicts.length > 0) {
          results.push({
            check: "sync",
            status: "warn",
            message: `${conflicts.length} sync conflict(s) need resolution`,
            fix: "Resolve conflicts with 'unforgit pull --force' or 'unforgit push --force' after reviewing the desired source of truth.",
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

      const apiKey = process.env.UNFORGIT_API_KEY;
      if (config.remote.url) {
        if (!apiKey) {
          results.push({
            check: "auth",
            status: "warn",
            message: "No API key configured. Set the UNFORGIT_API_KEY environment variable.",
            fix: "Set UNFORGIT_API_KEY in your shell or secret manager before remote sync.",
          });
        } else {
          results.push({
            check: "auth",
            status: "ok",
            message: "API key configured ([REDACTED])",
          });
        }

        try {
          const res = await fetch(`${config.remote.url}/health`);
          if (res.ok) {
            results.push({ check: "remote", status: "ok", message: `Server reachable at ${config.remote.url}` });

            if (apiKey) {
              const client = new RemoteClient(config.remote.url);
              try {
                await client.listApiKeys();
                results.push({ check: "remote-auth", status: "ok", message: "API key is valid" });
              } catch {
                results.push({
                  check: "remote-auth",
                  status: "error",
                  message: "API key is invalid or expired",
                  fix: "Create a new API key with 'unforgit keys create' or update UNFORGIT_API_KEY.",
                });
              }
            }
          } else {
            results.push({
              check: "remote",
              status: "error",
              message: `Server returned HTTP ${res.status}`,
              fix: "Check the Unforgit API server health endpoint and remote.url in unforgit.yaml.",
            });
          }
        } catch (err) {
          results.push({
            check: "remote",
            status: "error",
            message: `Cannot connect to ${config.remote.url}: ${err instanceof Error ? err.message : err}`,
            fix: "Start the Unforgit API server or update remote.url in unforgit.yaml.",
          });
        }
      } else {
        results.push({
          check: "remote",
          status: "warn",
          message: "No remote URL configured",
          fix: "Run 'unforgit remote add origin <url>' if this repo should sync remotely.",
        });
      }

      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        results.push({ check: "openai", status: "ok", message: "OpenAI API key configured ([REDACTED])" });
      } else {
        results.push({
          check: "openai",
          status: "warn",
          message: "No OpenAI API key. Auto-consolidation and embeddings backfill require it.",
          fix: "Set OPENAI_API_KEY before running embedding backfill or AI consolidation.",
        });
      }
    } catch (err) {
      results.push({
        check: "config",
        status: "error",
        message: err instanceof Error ? err.message : String(err),
        fix: `Fix ${configPath} or re-run 'unforgit init'.`,
      });
    }

    if (isJsonMode()) {
      outputJson(buildPayload(results));
      exitForResults(results);
      return;
    }

    printResults(results);
    exitForResults(results);
  });

function summarize(results: DiagnosticResult[]): DoctorSummary {
  return {
    ok: results.filter((r) => r.status === "ok").length,
    warnings: results.filter((r) => r.status === "warn").length,
    errors: results.filter((r) => r.status === "error").length,
  };
}

function buildPayload(results: DiagnosticResult[]): { summary: DoctorSummary; results: DiagnosticResult[] } {
  return { summary: summarize(results), results };
}

function exitForResults(results: DiagnosticResult[]): void {
  if (results.some((r) => r.status === "error")) {
    process.exit(EXIT_ERROR);
  }
}

function findDeprecatedConfigKeys(configPath: string): string[] {
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = (YAML.parse(raw) ?? {}) as Record<string, unknown>;
    const deprecated: string[] = [];
    if ((parsed.remote as Record<string, unknown> | undefined)?.apiKey) {
      deprecated.push("remote.apiKey");
    }
    if (parsed.openaiApiKey) {
      deprecated.push("openaiApiKey");
    }
    return deprecated;
  } catch {
    return [];
  }
}

function printResults(results: DiagnosticResult[]): void {
  const icons = { ok: "[ok]", warn: "[!!]", error: "[ERR]" };

  logger.info("Unforgit Doctor\n");

  for (const r of results) {
    const icon = icons[r.status];
    logger.info(`  ${icon} ${r.check}: ${r.message}`);
    if (r.fix) {
      logger.info(`       fix: ${r.fix}`);
    }
  }

  const { errors, warnings } = summarize(results);

  logger.info("");
  if (errors > 0) {
    logger.info(`${errors} error(s), ${warnings} warning(s)`);
  } else if (warnings > 0) {
    logger.info(`No errors, ${warnings} warning(s)`);
  } else {
    logger.info("All checks passed!");
  }
}
