import { Command } from "commander";
import { loadConfig, getDbPath, isInitialized } from "../config.js";
import { LocalStore } from "../../db/local.js";

export const logCommand = new Command("log")
  .description("Show memory history log")
  .option("-n, --max-count <n>", "Limit the number of memories shown", "10")
  .option("--oneline", "Show each memory on a single line")
  .option("--all", "Show all memories including deprecated/superseded")
  .option("--type <type>", "Filter by memory type (episodic|semantic|procedural)")
  .option("--tags <tags>", "Filter by tags (comma-separated)")
  .action((opts) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadConfig();
    const store = new LocalStore(getDbPath());
    const orgId = config.remote.orgId || "local";
    const repoId = config.remote.repoId || "local";

    const limit = parseInt(opts.maxCount, 10);
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
      console.log("No memories found.");
      store.close();
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
        console.log(`${mem.id.slice(0, 7)} ${typeIcon} ${text}${mem.text.length > 60 ? "..." : ""}`);
      }
    } else {
      for (const mem of filteredMemories) {
        const typeIcon = getTypeIcon(mem.memoryType);
        const date = mem.createdAt.toISOString().split("T")[0];
        const time = mem.createdAt.toISOString().split("T")[1].slice(0, 5);
        
        console.log(`\x1b[33mmemory ${mem.id}\x1b[0m`);
        console.log(`Type:   ${typeIcon} ${mem.memoryType}`);
        console.log(`Date:   ${date} ${time}`);
        console.log(`Status: ${mem.status}`);
        if (mem.tags.length > 0) {
          console.log(`Tags:   ${mem.tags.join(", ")}`);
        }
        console.log();
        console.log(`    ${mem.text.split("\n").join("\n    ")}`);
        console.log();
      }
    }

    store.close();
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
