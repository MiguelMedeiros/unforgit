import { Command } from "commander";
import { loadConfig } from "../config.js";
import { RemoteClient } from "../remote-client.js";

export const consolidateCommand = new Command("consolidate")
  .description("Consolidate episodic memories into semantic/procedural")
  .option("--from-pr <url>", "PR URL to consolidate from")
  .option("--from-commit <sha>", "Commit SHA to consolidate from")
  .option("--last-n <n>", "Consolidate the last N memories")
  .action(async (opts) => {
    const config = loadConfig();

    if (!config.remote.url) {
      console.error("Error: Remote URL not configured. Update hippo.yaml.");
      process.exit(1);
    }

    const client = new RemoteClient(config.remote.url);

    const body: Record<string, unknown> = {
      orgId: config.remote.orgId,
      repoId: config.remote.repoId,
    };

    if (opts.fromPr || opts.fromCommit) {
      body.source = {
        prUrl: opts.fromPr,
        commitSha: opts.fromCommit,
      };
    }

    if (opts.lastN) {
      body.lastN = parseInt(opts.lastN, 10);
    }

    try {
      const result = await client.consolidate(body);

      console.log("Consolidation complete:");
      console.log(`  Created: ${result.created.length} memories`);
      console.log(`  Superseded: ${result.superseded.length} memories`);
      console.log(`  Processed: ${result.processedCount} total`);

      if (result.created.length > 0) {
        console.log("\nNew memories:");
        for (const id of result.created) {
          console.log(`  - ${id}`);
        }
      }
    } catch (err) {
      console.error(
        `Error consolidating: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(1);
    }
  });
