import { Command } from "commander";
import { loadConfig, getDbPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";

export const deleteCommand = new Command("delete")
  .description("Soft delete a memory (can be restored)")
  .argument("<id>", "Memory ID to delete")
  .option("--hard", "Permanently delete (cannot be restored)")
  .option("--remote", "Delete on remote")
  .option("--by <author>", "Author of the deletion")
  .action(async (id, opts) => {
    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url, config.remote.apiKey);

      try {
        await client.delete(id, opts.by, opts.hard);
        const action = opts.hard ? "Hard deleted" : "Soft deleted";
        console.log(`${action} remote memory ${id.slice(0, 8)}...`);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : err}`,
        );
        process.exit(1);
      }
      return;
    }

    const store = new LocalStore(getDbPath());
    
    let ok: boolean;
    if (opts.hard) {
      ok = store.hardDelete(id);
    } else {
      ok = store.softDelete({ id, deletedBy: opts.by });
    }
    
    store.close();

    if (!ok) {
      console.error(`Error: Memory ${id} not found.`);
      process.exit(1);
    }

    const action = opts.hard ? "Hard deleted" : "Soft deleted";
    console.log(`${action} local memory ${id.slice(0, 8)}...`);
    if (!opts.hard) {
      console.log("  This memory can be restored with 'hippo restore'.");
    }
  });

export const restoreCommand = new Command("restore")
  .description("Restore a soft-deleted memory")
  .argument("<id>", "Memory ID to restore")
  .option("--remote", "Restore on remote")
  .action(async (id, opts) => {
    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url, config.remote.apiKey);

      try {
        await client.restore(id);
        console.log(`Restored remote memory ${id.slice(0, 8)}...`);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : err}`,
        );
        process.exit(1);
      }
      return;
    }

    const store = new LocalStore(getDbPath());
    const ok = store.restore(id);
    store.close();

    if (!ok) {
      console.error(`Error: Memory ${id} not found or not deleted.`);
      process.exit(1);
    }

    console.log(`Restored local memory ${id.slice(0, 8)}...`);
  });
