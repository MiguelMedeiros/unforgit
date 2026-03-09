import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { LocalStore } from "../../db/local.js";
import { parsePositiveInt, validateMemoryType } from "../schemas.js";
import { isJsonMode, outputJson, paginate } from "../utils.js";

export const logCommand = new Command("log")
  .description("Show memory history log")
  .option("-n, --max-count <n>", "Limit the number of memories shown", "20")
  .option("--oneline", "Show each memory on a single line")
  .option("--all", "Show all memories including deprecated/superseded")
  .option("--type <type>", "Filter by memory type (episodic|semantic|procedural)")
  .option("--tags <tags>", "Filter by tags (comma-separated)")
  .option("--page <n>", "Page number for pagination", "1")
  .option("--per-page <n>", "Items per page", "20")
  .addHelpText("after", `
Examples:
  unforgit log                     Show recent memories
  unforgit log --all               Include deprecated/superseded
  unforgit log --type semantic     Filter by type
  unforgit log --oneline           Compact output
  unforgit log --page 2            Second page of results`)
  .action((opts) => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const store = new LocalStore(getDbPath());

    try {
      const orgId = config.remote.orgId || "local";
      const repoId = config.remote.repoId || "local";

      const limit = parsePositiveInt(opts.maxCount, "max-count");

      if (opts.type && !validateMemoryType(opts.type)) {
        logger.error(`Invalid memory type "${opts.type}". Must be one of: episodic, semantic, procedural`);
        process.exit(EXIT_ERROR);
      }

      const types = opts.type ? [opts.type] : undefined;
      const status = opts.all ? undefined : ["active" as const];

      const memories = store.list({
        orgId,
        repoId,
        types,
        status,
        limit,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      let filteredMemories = memories;
      if (opts.tags) {
        const filterTags = opts.tags.split(",").map((t: string) => t.trim());
        filteredMemories = memories.filter((m) =>
          m.tags.some((t) => filterTags.includes(t))
        );
      }

      const page = parsePositiveInt(opts.page, "page");
      const perPage = parsePositiveInt(opts.perPage, "per-page");
      const paged = paginate(filteredMemories, page, perPage);

      if (isJsonMode()) {
        outputJson({
          memories: paged.items.map((m) => ({
            id: m.id,
            type: m.memoryType,
            status: m.status,
            text: m.text,
            tags: m.tags,
            createdAt: m.createdAt.toISOString(),
          })),
          page: paged.currentPage,
          totalPages: paged.totalPages,
          total: paged.total,
        });
        return;
      }

      if (paged.items.length === 0) {
        logger.info("No memories found.");
        return;
      }

      if (opts.oneline) {
        for (const mem of paged.items) {
          const text = mem.text.replace(/\n/g, " ").slice(0, 60);
          logger.info(`${mem.id.slice(0, 7)} [${mem.memoryType}] ${text}${mem.text.length > 60 ? "..." : ""}`);
        }
      } else {
        for (const mem of paged.items) {
          const date = mem.createdAt.toISOString().split("T")[0];
          const time = mem.createdAt.toISOString().split("T")[1].slice(0, 5);

          logger.info(`memory ${mem.id}`);
          logger.info(`Type:   ${mem.memoryType}`);
          logger.info(`Date:   ${date} ${time}`);
          logger.info(`Status: ${mem.status}`);
          if (mem.tags.length > 0) {
            logger.info(`Tags:   ${mem.tags.join(", ")}`);
          }
          logger.info("");
          logger.info(`    ${mem.text.split("\n").join("\n    ")}`);
          logger.info("");
        }
      }

      if (paged.totalPages > 1) {
        logger.info(`Page ${paged.currentPage}/${paged.totalPages} (${paged.total} total)`);
      }
    } finally {
      store.close();
    }
  });
