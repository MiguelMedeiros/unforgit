import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import { logger } from "../logger.js";
import { EXIT_ERROR, EXIT_CONFIG_ERROR } from "../exit-codes.js";
import { LocalStore } from "../../db/local.js";
import { parsePositiveInt, validateMemoryType } from "../schemas.js";

export const logCommand = new Command("log")
  .description("Show memory history log")
  .option("-n, --max-count <n>", "Limit the number of memories shown", "10")
  .option("--oneline", "Show each memory on a single line")
  .option("--all", "Show all memories including deprecated/superseded")
  .option("--type <type>", "Filter by memory type (episodic|semantic|procedural)")
  .option("--tags <tags>", "Filter by tags (comma-separated)")
  .action((opts) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
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

      if (memories.length === 0) {
        logger.info("No memories found.");
        return;
      }

      let filteredMemories = memories;
      if (opts.tags) {
        const filterTags = opts.tags.split(",").map((t: string) => t.trim());
        filteredMemories = memories.filter((m) =>
          m.tags.some((t) => filterTags.includes(t))
        );
      }

      if (opts.oneline) {
        for (const mem of filteredMemories) {
          const typeIcon = getTypeIcon(mem.memoryType);
          const text = mem.text.replace(/\n/g, " ").slice(0, 60);
          logger.info(`${mem.id.slice(0, 7)} ${typeIcon} ${text}${mem.text.length > 60 ? "..." : ""}`);
        }
      } else {
        for (const mem of filteredMemories) {
          const typeIcon = getTypeIcon(mem.memoryType);
          const date = mem.createdAt.toISOString().split("T")[0];
          const time = mem.createdAt.toISOString().split("T")[1].slice(0, 5);
          
          logger.info(`\x1b[33mmemory ${mem.id}\x1b[0m`);
          logger.info(`Type:   ${typeIcon} ${mem.memoryType}`);
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
    } finally {
      store.close();
    }
  });

function getTypeIcon(type: string): string {
  switch (type) {
    case "episodic":
      return "📝";
    case "semantic":
      return "📚";
    case "procedural":
      return "⚙️";
    default:
      return "•";
  }
}
