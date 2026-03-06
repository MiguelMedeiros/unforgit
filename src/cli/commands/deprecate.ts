import { Command } from "commander";
import { loadConfig, getDbPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";

export const deprecateCommand = new Command("deprecate")
  .description("Mark a memory as deprecated")
  .argument("<id>", "Memory ID to deprecate")
  .option("--reason <reason>", "Reason for deprecation")
  .option("--remote", "Deprecate on remote")
  .action(async (id, opts) => {
    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url, config.remote.apiKey);

      try {
        await client.deprecate(id, opts.reason);
        console.log(`Deprecated remote memory ${id.slice(0, 8)}...`);
        if (opts.reason) console.log(`  Reason: ${opts.reason}`);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : err}`,
        );
        process.exit(1);
      }
      return;
    }

    const store = new LocalStore(getDbPath());

    try {
      const ok = store.deprecate(id, opts.reason);

      if (!ok) {
        console.error(`Error: Memory ${id} not found.`);
        process.exit(1);
      }

      console.log(`Deprecated local memory ${id.slice(0, 8)}...`);
      if (opts.reason) console.log(`  Reason: ${opts.reason}`);
    } finally {
      store.close();
    }
  });
