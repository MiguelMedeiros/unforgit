import { Command } from "commander";
import type { CurationSuggestion, CurationSuggestionStatus } from "unforgit-shared";
import { getDbPath, isInitialized, loadConfig } from "unforgit-config";
import { LocalStore } from "unforgit-db";
import { generateSuggestions, persistReviewableSuggestions } from "unforgit-core";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR, EXIT_ERROR } from "../exit-codes.js";
import { isJsonMode, outputJson } from "../utils.js";

function openStore() {
  if (!isInitialized()) {
    logger.error("Unforgit not initialized. Run 'unforgit init' first.");
    process.exit(EXIT_CONFIG_ERROR);
  }

  const config = loadConfig();
  return {
    config,
    orgId: config.remote.orgId || "local",
    repoId: config.remote.repoId || "local",
    store: new LocalStore(getDbPath()),
  };
}

function formatSuggestionLine(suggestion: CurationSuggestion): string {
  const memoryIds = suggestion.memoryIds.map((id) => id.slice(0, 8)).join(", ");
  return [
    `${suggestion.id.slice(0, 8)} [${suggestion.priority}] ${suggestion.type}`,
    `  status: ${suggestion.status}`,
    `  confidence: ${Math.round(suggestion.confidence * 100)}%`,
    `  memories: ${memoryIds || "none"}`,
    `  reason: ${suggestion.reason}`,
  ].join("\n");
}

function parseStatus(value: string | undefined): CurationSuggestionStatus[] | undefined {
  if (!value) return ["pending"];
  const statuses = value.split(",").map((status) => status.trim()).filter(Boolean);
  const allowed = new Set(["pending", "approved", "rejected", "applied"]);
  const invalid = statuses.find((status) => !allowed.has(status));
  if (invalid) {
    throw new Error(`Invalid suggestion status: ${invalid}`);
  }
  return statuses as CurationSuggestionStatus[];
}

export const suggestionsCommand = new Command("suggestions")
  .description("Reviewable curation suggestions inbox")
  .addCommand(
    new Command("generate")
      .description("Generate and persist pending review suggestions")
      .option("--max <n>", "Maximum generated suggestions", (value) => Number.parseInt(value, 10), 20)
      .option("--created-by <name>", "Actor name stored on generated suggestions", "cli")
      .action((opts) => {
        const { store, orgId, repoId } = openStore();
        try {
          const generated = generateSuggestions(store, orgId, repoId, {
            maxSuggestions: opts.max,
          });
          const persisted = persistReviewableSuggestions(
            store,
            orgId,
            repoId,
            generated.suggestions,
            { createdBy: opts.createdBy },
          );

          const result = { ...generated.stats, ...persisted };
          if (isJsonMode()) {
            outputJson(result);
            return;
          }

          logger.info(
            `Generated ${generated.stats.suggestionsGenerated} suggestions; created ${persisted.created} pending review items; skipped ${persisted.skippedExisting} existing.`,
          );
        } finally {
          store.close();
        }
      }),
  )
  .addCommand(
    new Command("list")
      .description("List curation suggestions by review status")
      .option("--status <statuses>", "Comma-separated statuses (default: pending)")
      .option("--limit <n>", "Maximum suggestions to show", (value) => Number.parseInt(value, 10), 20)
      .action((opts) => {
        const { store, orgId, repoId } = openStore();
        try {
          const status = parseStatus(opts.status);
          const suggestions = store.listCurationSuggestions({
            orgId,
            repoId,
            status,
            limit: opts.limit,
          });

          if (isJsonMode()) {
            outputJson({ suggestions });
            return;
          }

          const label = status?.join(",") ?? "all";
          logger.info(`${label === "pending" ? "Pending" : label} curation suggestions`);
          if (suggestions.length === 0) {
            logger.info("No suggestions found.");
            return;
          }

          for (const suggestion of suggestions) {
            logger.info(formatSuggestionLine(suggestion));
            logger.info("");
          }
        } finally {
          store.close();
        }
      }),
  )
  .addCommand(
    new Command("review")
      .description("Approve, reject, or mark a curation suggestion as applied")
      .argument("<id>", "Suggestion id")
      .option("--approve", "Mark suggestion as approved")
      .option("--reject", "Mark suggestion as rejected")
      .option("--applied", "Mark suggestion as applied")
      .option("--reviewer <name>", "Reviewer name")
      .option("--note <note>", "Review note")
      .action((id, opts) => {
        const selected = [opts.approve, opts.reject, opts.applied].filter(Boolean).length;
        if (selected !== 1) {
          logger.error("Choose exactly one of --approve, --reject, or --applied.");
          process.exit(EXIT_ERROR);
        }

        const status: Exclude<CurationSuggestionStatus, "pending"> = opts.approve
          ? "approved"
          : opts.reject
            ? "rejected"
            : "applied";

        const { store } = openStore();
        try {
          const suggestion = store.reviewCurationSuggestion({
            id,
            status,
            reviewedBy: opts.reviewer,
            reviewNote: opts.note,
          });

          if (isJsonMode()) {
            outputJson(suggestion);
            return;
          }

          logger.info(`Suggestion ${suggestion.id.slice(0, 8)} marked ${suggestion.status}.`);
        } finally {
          store.close();
        }
      }),
  );
