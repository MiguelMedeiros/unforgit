import { Command } from "commander";
import { loadConfig, getDbPath } from "@unforgit/config";
import { logger } from "../logger.js";
import { LocalStore } from "@unforgit/db";
import { RemoteClient } from "@unforgit/config";
import { mergeAndRank } from "@unforgit/core";
import { resolveLifecycleConfig } from "@unforgit/core";
import type { MemoryType, RecallResult } from "@unforgit/shared";
import { parsePositiveInt } from "@unforgit/config";
import { EXIT_ERROR } from "../exit-codes.js";
import { isJsonMode, outputJson, paginate } from "../utils.js";

export const recallCommand = new Command("recall")
  .description("Recall memories matching a query")
  .argument("<query>", "Search query")
  .option(
    "--types <types>",
    "Comma-separated types (episodic,semantic,procedural)",
  )
  .option("--tags <tags>", "Comma-separated tags to filter")
  .option("-k, --limit <n>", "Max results", "10")
  .option("--remote-only", "Only query remote")
  .option("--local-only", "Only query local")
  .option("--page <n>", "Page number for pagination", "1")
  .option("--per-page <n>", "Items per page", "10")
  .addHelpText("after", `
Examples:
  unforgit recall "authentication"             Search all memories
  unforgit recall "deploy" --types procedural  Filter by type
  unforgit recall "bug" --tags auth,api        Filter by tags
  unforgit recall "setup" --local-only         Local search only`)
  .action(async (query, opts) => {
    if (!query || !query.trim()) {
      logger.error("Search query cannot be empty.");
      process.exit(EXIT_ERROR);
    }

    const config = loadConfig();
    const usageTrackingLimit = resolveLifecycleConfig(config.lifecycle).usageBoost.topKToRecord;
    const k = parsePositiveInt(opts.limit, "limit");

    const VALID_TYPES = ["episodic", "semantic", "procedural"];
    const types = opts.types
      ? (opts.types.split(",").map((t: string) => t.trim()) as MemoryType[])
      : undefined;

    if (types) {
      const invalid = types.filter((t) => !VALID_TYPES.includes(t));
      if (invalid.length > 0) {
        logger.error(
          `Invalid memory type(s): ${invalid.join(", ")}. Must be one of: ${VALID_TYPES.join(", ")}`,
        );
        process.exit(EXIT_ERROR);
      }
    }
    const tags = opts.tags
      ? opts.tags.split(",").map((t: string) => t.trim())
      : undefined;

    let localResults: RecallResult[] = [];
    let remoteResults: RecallResult[] = [];

    const recallQuery = {
      orgId: config.remote.orgId || "local",
      repoId: config.remote.repoId || "local",
      query,
      types,
      tags,
      k,
    };

    if (!opts.remoteOnly) {
      let store: LocalStore | undefined;
      try {
        store = new LocalStore(getDbPath());
        localResults = store.recall(recallQuery);
        const idsToRecord = localResults
          .slice(0, usageTrackingLimit)
          .map((result) => result.id);
        if (idsToRecord.length > 0) {
          store.recordUsageBatch(idsToRecord, query);
        }
      } catch {
        if (!opts.localOnly) {
          logger.warn("Local store not available");
        }
      } finally {
        store?.close();
      }
    }

    if (!opts.localOnly && config.remote.url) {
      try {
        const client = new RemoteClient(config.remote.url, config.remote.apiKey);
        const response = await client.recall(recallQuery);
        remoteResults = response.results.map((r) => ({
          ...r,
          source: "remote" as const,
        }));
      } catch {
        if (!opts.remoteOnly) {
          logger.warn("Remote API not available");
        }
      }
    }

    const results = mergeAndRank(localResults, remoteResults, k);

    const page = parsePositiveInt(opts.page, "page");
    const perPage = parsePositiveInt(opts.perPage, "per-page");
    const paged = paginate(results, page, perPage);

    if (isJsonMode()) {
      outputJson({
        results: paged.items.map((r) => ({
          id: r.id,
          source: r.source,
          type: r.memoryType,
          score: r.score,
          text: r.text,
          tags: r.tags,
        })),
        page: paged.currentPage,
        totalPages: paged.totalPages,
        total: paged.total,
      });
      return;
    }

    if (results.length === 0) {
      logger.info("No memories found.");
      return;
    }

    logger.info(`Found ${results.length} memories:\n`);
    for (const r of paged.items) {
      const sourceTag = r.source === "local" ? "[local]" : "[remote]";
      logger.info(
        `${sourceTag} [${r.memoryType}] ${r.id.slice(0, 8)}... (score: ${r.score.toFixed(3)})`,
      );
      logger.info(`  ${r.text.slice(0, 120)}${r.text.length > 120 ? "..." : ""}`);
      if (r.tags.length > 0) logger.info(`  Tags: ${r.tags.join(", ")}`);
      logger.info("");
    }

    if (paged.totalPages > 1) {
      logger.info(`Page ${paged.currentPage}/${paged.totalPages} (${paged.total} total)`);
    }
  });
