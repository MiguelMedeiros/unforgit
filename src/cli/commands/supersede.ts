import { Command } from "commander";
import { loadConfig, getDbPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";

export const supersedeCommand = new Command("supersede")
  .description("Mark a memory as superseded by another")
  .argument("<old-id>", "Memory ID being superseded")
  .requiredOption("--with <new-id>", "ID of the new memory that replaces it")
  .option("--remote", "Supersede on remote")
  .action(async (oldId, opts) => {
    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url, config.remote.apiKey);

      try {
        await client.supersede(oldId, opts.with);
        console.log(
          `Superseded remote memory ${oldId.slice(0, 8)}... with ${opts.with.slice(0, 8)}...`,
        );
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : err}`,
        );
        process.exit(1);
      }
      return;
    }

    const store = new LocalStore(getDbPath());
    const ok = store.supersede(oldId, opts.with);
    store.close();

    if (!ok) {
      console.error(`Error: Memory ${oldId} not found.`);
      process.exit(1);
    }

    console.log(
      `Superseded local memory ${oldId.slice(0, 8)}... with ${opts.with.slice(0, 8)}...`,
    );
  });
