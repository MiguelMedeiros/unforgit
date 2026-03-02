import { Command } from "commander";
import { loadConfig, getDbPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { RemoteClient } from "../remote-client.js";
import type { LinkType } from "../../core/types.js";

const VALID_LINK_TYPES = [
  "related_to",
  "derived_from",
  "contradicts",
  "depends_on",
] as const;

export const linkCommand = new Command("link")
  .description("Create a link between two memories")
  .argument("<source-id>", "Source memory ID")
  .argument("<target-id>", "Target memory ID")
  .requiredOption(
    "--type <link-type>",
    "Link type (related_to, derived_from, contradicts, depends_on)",
  )
  .option("--remote", "Create link on remote")
  .action(async (sourceId, targetId, opts) => {
    if (!VALID_LINK_TYPES.includes(opts.type)) {
      console.error(
        `Error: Invalid link type "${opts.type}". Must be one of: ${VALID_LINK_TYPES.join(", ")}`,
      );
      process.exit(1);
    }

    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url);

      try {
        const result = await client.link(sourceId, targetId, opts.type);
        console.log(
          `Linked remote: ${sourceId.slice(0, 8)} --[${opts.type}]--> ${targetId.slice(0, 8)} (${result.link.id.slice(0, 8)})`,
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
    try {
      const link = store.link({
        sourceId,
        targetId,
        linkType: opts.type as LinkType,
      });
      console.log(
        `Linked: ${sourceId.slice(0, 8)} --[${opts.type}]--> ${targetId.slice(0, 8)} (${link.id.slice(0, 8)})`,
      );
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : err}`,
      );
      process.exit(1);
    } finally {
      store.close();
    }
  });

export const unlinkCommand = new Command("unlink")
  .description("Remove a link between two memories")
  .argument("<source-id>", "Source memory ID")
  .argument("<target-id>", "Target memory ID")
  .requiredOption(
    "--type <link-type>",
    "Link type (related_to, derived_from, contradicts, depends_on)",
  )
  .option("--remote", "Remove link on remote")
  .action(async (sourceId, targetId, opts) => {
    if (!VALID_LINK_TYPES.includes(opts.type)) {
      console.error(
        `Error: Invalid link type "${opts.type}". Must be one of: ${VALID_LINK_TYPES.join(", ")}`,
      );
      process.exit(1);
    }

    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url);

      try {
        await client.unlink(sourceId, targetId, opts.type);
        console.log(
          `Unlinked remote: ${sourceId.slice(0, 8)} --[${opts.type}]--> ${targetId.slice(0, 8)}`,
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
    const ok = store.unlink(sourceId, targetId, opts.type);
    store.close();

    if (!ok) {
      console.error("Error: Link not found.");
      process.exit(1);
    }

    console.log(
      `Unlinked: ${sourceId.slice(0, 8)} --[${opts.type}]--> ${targetId.slice(0, 8)}`,
    );
  });

export const linksCommand = new Command("links")
  .description("List all links for a memory")
  .argument("<memory-id>", "Memory ID to get links for")
  .option(
    "--type <link-type>",
    "Filter by link type (related_to, derived_from, contradicts, depends_on)",
  )
  .option("--remote", "List links on remote")
  .action(async (memoryId, opts) => {
    if (opts.type && !VALID_LINK_TYPES.includes(opts.type)) {
      console.error(
        `Error: Invalid link type "${opts.type}". Must be one of: ${VALID_LINK_TYPES.join(", ")}`,
      );
      process.exit(1);
    }

    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url);

      try {
        const result = await client.getLinks(memoryId, opts.type);
        if (result.links.length === 0) {
          console.log("No links found.");
          return;
        }
        console.log(`Found ${result.links.length} links:\n`);
        for (const l of result.links) {
          const direction =
            l.sourceId === memoryId
              ? `--[${l.linkType}]--> ${l.targetId.slice(0, 8)}`
              : `<--[${l.linkType}]-- ${l.sourceId.slice(0, 8)}`;
          console.log(`  ${l.id.slice(0, 8)}: ${direction}`);
        }
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : err}`,
        );
        process.exit(1);
      }
      return;
    }

    const store = new LocalStore(getDbPath());
    const links = store.getLinks({
      memoryId,
      linkType: opts.type as LinkType | undefined,
    });
    store.close();

    if (links.length === 0) {
      console.log("No links found.");
      return;
    }

    console.log(`Found ${links.length} links:\n`);
    for (const l of links) {
      const direction =
        l.sourceId === memoryId
          ? `--[${l.linkType}]--> ${l.targetId.slice(0, 8)}`
          : `<--[${l.linkType}]-- ${l.sourceId.slice(0, 8)}`;
      console.log(`  ${l.id.slice(0, 8)}: ${direction}`);
    }
  });
