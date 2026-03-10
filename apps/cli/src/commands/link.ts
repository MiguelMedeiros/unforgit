import { Command } from "commander";
import { loadConfig, getDbPath } from "@unforgit/config";
import { LocalStore } from "@unforgit/db";
import { RemoteClient } from "@unforgit/config";
import type { LinkType } from "@unforgit/shared";
import { logger } from "../logger.js";
import { EXIT_ERROR } from "../exit-codes.js";
import { isJsonMode, outputJson } from "../utils.js";

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
  .addHelpText("after", `
Examples:
  unforgit link abc123 def456 --type related_to
  unforgit link abc123 def456 --type derived_from --remote`)
  .action(async (sourceId, targetId, opts) => {
    if (!VALID_LINK_TYPES.includes(opts.type)) {
      logger.error(
        `Invalid link type "${opts.type}". Must be one of: ${VALID_LINK_TYPES.join(", ")}`,
      );
      process.exit(EXIT_ERROR);
    }

    if (sourceId === targetId) {
      logger.error("Cannot link a memory to itself.");
      process.exit(EXIT_ERROR);
    }

    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url);

      try {
        const result = await client.link(sourceId, targetId, opts.type);
        logger.info(
          `Linked remote: ${sourceId.slice(0, 8)} --[${opts.type}]--> ${targetId.slice(0, 8)} (${result.link.id.slice(0, 8)})`,
        );
      } catch (err) {
        logger.error(
          err instanceof Error ? err.message : String(err),
        );
        process.exit(EXIT_ERROR);
      }
      return;
    }

    const store = new LocalStore(getDbPath());
    try {
      const source = store.getById(sourceId);
      if (!source) {
        logger.error(`Source memory ${sourceId} not found.`);
        process.exit(EXIT_ERROR);
      }
      if (source.status === "deleted") {
        logger.error(`Source memory ${sourceId.slice(0, 8)} is deleted. Restore it first.`);
        process.exit(EXIT_ERROR);
      }

      const target = store.getById(targetId);
      if (!target) {
        logger.error(`Target memory ${targetId} not found.`);
        process.exit(EXIT_ERROR);
      }
      if (target.status === "deleted") {
        logger.error(`Target memory ${targetId.slice(0, 8)} is deleted. Restore it first.`);
        process.exit(EXIT_ERROR);
      }

      const link = store.link({
        sourceId,
        targetId,
        linkType: opts.type as LinkType,
      });
      logger.info(
        `Linked: ${sourceId.slice(0, 8)} --[${opts.type}]--> ${targetId.slice(0, 8)} (${link.id.slice(0, 8)})`,
      );
    } catch (err) {
      logger.error(
        err instanceof Error ? err.message : String(err),
      );
      process.exit(EXIT_ERROR);
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
      logger.error(
        `Invalid link type "${opts.type}". Must be one of: ${VALID_LINK_TYPES.join(", ")}`,
      );
      process.exit(EXIT_ERROR);
    }

    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url);

      try {
        await client.unlink(sourceId, targetId, opts.type);
        logger.info(
          `Unlinked remote: ${sourceId.slice(0, 8)} --[${opts.type}]--> ${targetId.slice(0, 8)}`,
        );
      } catch (err) {
        logger.error(
          err instanceof Error ? err.message : String(err),
        );
        process.exit(EXIT_ERROR);
      }
      return;
    }

    const store = new LocalStore(getDbPath());

    try {
      const ok = store.unlink(sourceId, targetId, opts.type);

      if (!ok) {
        logger.error("Link not found.");
        process.exit(EXIT_ERROR);
      }

      logger.info(
        `Unlinked: ${sourceId.slice(0, 8)} --[${opts.type}]--> ${targetId.slice(0, 8)}`,
      );
    } finally {
      store.close();
    }
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
      logger.error(
        `Invalid link type "${opts.type}". Must be one of: ${VALID_LINK_TYPES.join(", ")}`,
      );
      process.exit(EXIT_ERROR);
    }

    if (opts.remote) {
      const config = loadConfig();
      const client = new RemoteClient(config.remote.url);

      try {
        const result = await client.getLinks(memoryId, opts.type);

        if (isJsonMode()) {
          outputJson(result);
          return;
        }

        if (result.links.length === 0) {
          logger.info("No links found.");
          return;
        }
        logger.info(`Found ${result.links.length} links:\n`);
        for (const l of result.links) {
          const direction =
            l.sourceId === memoryId
              ? `--[${l.linkType}]--> ${l.targetId.slice(0, 8)}`
              : `<--[${l.linkType}]-- ${l.sourceId.slice(0, 8)}`;
          logger.info(`  ${l.id.slice(0, 8)}: ${direction}`);
        }
      } catch (err) {
        logger.error(
          err instanceof Error ? err.message : String(err),
        );
        process.exit(EXIT_ERROR);
      }
      return;
    }

    const store = new LocalStore(getDbPath());

    try {
      const links = store.getLinks({
        memoryId,
        linkType: opts.type as LinkType | undefined,
      });

      if (isJsonMode()) {
        outputJson({
          links: links.map((l) => ({
            id: l.id,
            sourceId: l.sourceId,
            targetId: l.targetId,
            linkType: l.linkType,
          })),
        });
        return;
      }

      if (links.length === 0) {
        logger.info("No links found.");
        return;
      }

      logger.info(`Found ${links.length} links:\n`);
      for (const l of links) {
        const direction =
          l.sourceId === memoryId
            ? `--[${l.linkType}]--> ${l.targetId.slice(0, 8)}`
            : `<--[${l.linkType}]-- ${l.sourceId.slice(0, 8)}`;
        logger.info(`  ${l.id.slice(0, 8)}: ${direction}`);
      }
    } finally {
      store.close();
    }
  });
