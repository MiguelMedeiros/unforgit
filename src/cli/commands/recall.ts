import { Command } from "commander";
import { loadConfig, getDbPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";
import { mergeAndRank } from "../../core/recall.js";
import type { MemoryType, RecallResult } from "../../core/types.js";

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
  .action(async (query, opts) => {
    const config = loadConfig();
    const k = parseInt(opts.limit, 10);
    const types = opts.types
      ? (opts.types.split(",").map((t: string) => t.trim()) as MemoryType[])
      : undefined;
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
      try {
        const store = new LocalStore(getDbPath());
        localResults = store.recall(recallQuery);
        store.close();
      } catch {
        if (!opts.localOnly) {
          console.error("Warning: Local store not available");
        }
      }
    }

    if (!opts.localOnly && config.remote.url) {
      try {
        const client = new RemoteClient(config.remote.url);
        const response = await client.recall(recallQuery);
        remoteResults = response.results.map((r) => ({
          ...r,
          source: "remote" as const,
        }));
      } catch {
        if (!opts.remoteOnly) {
          console.error("Warning: Remote API not available");
        }
      }
    }

    const results = mergeAndRank(localResults, remoteResults, k);

    if (results.length === 0) {
      console.log("No memories found.");
      return;
    }

    console.log(`Found ${results.length} memories:\n`);
    for (const r of results) {
      const sourceTag = r.source === "local" ? "[local]" : "[remote]";
      console.log(
        `${sourceTag} [${r.memoryType}] ${r.id.slice(0, 8)}... (score: ${r.score.toFixed(3)})`,
      );
      console.log(`  ${r.text.slice(0, 120)}${r.text.length > 120 ? "..." : ""}`);
      if (r.tags.length > 0) console.log(`  Tags: ${r.tags.join(", ")}`);
      console.log();
    }
  });
