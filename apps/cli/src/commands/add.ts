import { Command } from "commander";
import { loadConfig, getDbPath } from "unforgit-config";
import { logger } from "../logger.js";
import { EXIT_ERROR } from "../exit-codes.js";
import { LocalStore } from "unforgit-db";
import { resolveVisibility } from "unforgit-core";
import { applyLifecycleDefaults } from "unforgit-core";
import type { MemoryType } from "unforgit-shared";
import { getTemplate, applyTemplate, formatTemplateList } from "unforgit-core";
import { validateMemoryType, parseConfidence, parseTtl } from "unforgit-config";

export const addCommand = new Command("add")
  .description("Add a memory (local by default)")
  .argument("<text>", "Memory text content")
  .option(
    "-t, --type <type>",
    "Memory type (episodic|semantic|procedural)",
  )
  .option("--tags <tags>", "Comma-separated tags", "")
  .option(
    "--visibility <visibility>",
    "Visibility (private|repo|auto)",
  )
  .option("--source-pr <url>", "Source PR URL")
  .option("--source-commit <sha>", "Source commit SHA")
  .option("--confidence <n>", "Confidence score 0-1")
  .option("--ttl <seconds>", "TTL in seconds")
  .option("--template <name>", "Use a template (decision, gotcha, playbook, etc.)")
  .option("--list-templates", "List available templates")
  .addHelpText("after", `
Examples:
  unforgit add "We use UTC timestamps everywhere" -t semantic --tags time,convention
  unforgit add "Found race condition in worker" -t episodic --tags bug
  unforgit add "To deploy: run make release" --template playbook`)
  .action((text, opts) => {
    if (opts.listTemplates) {
      logger.info(formatTemplateList());
      return;
    }

    if (!text || !text.trim()) {
      logger.error("Memory text cannot be empty.");
      process.exit(EXIT_ERROR);
    }

    const config = loadConfig();
    const store = new LocalStore(getDbPath());

    try {
      let userTags: string[] = [...new Set(
        opts.tags
          ? opts.tags.split(",").map((t: string) => t.trim()).filter(Boolean) as string[]
          : [] as string[],
      )];

      if (opts.type && !validateMemoryType(opts.type)) {
        logger.error(`Invalid memory type "${opts.type}". Must be one of: episodic, semantic, procedural`);
        process.exit(EXIT_ERROR);
      }

      let memoryType = (opts.type ?? config.defaults.memoryType) as MemoryType;
      let memoryText = text;
      let visibility = opts.visibility ?? config.defaults.visibility;

      if (opts.template) {
        const template = getTemplate(opts.template);
        if (!template) {
          logger.error(`Unknown template: ${opts.template}`);
          logger.info("\n" + formatTemplateList());
          process.exit(EXIT_ERROR);
        }

        const applied = applyTemplate(template, text, userTags);
        memoryText = applied.text;
        memoryType = applied.memoryType;
        userTags = applied.tags;
        if (visibility === "auto") {
          visibility = applied.visibility;
        }

        logger.info(`Using template: ${template.name}`);
      }

      const sourceRefs: Record<string, unknown> = {};
      if (opts.sourcePr) sourceRefs.pr_url = opts.sourcePr;
      if (opts.sourceCommit) sourceRefs.commit_sha = opts.sourceCommit;

      const input = applyLifecycleDefaults({
        orgId: config.remote.orgId || "local",
        repoId: config.remote.repoId || "local",
        memoryType,
        text: memoryText,
        tags: userTags,
        sourceRefs: Object.keys(sourceRefs).length > 0 ? sourceRefs : undefined,
        confidence: opts.confidence ? parseConfidence(opts.confidence) : undefined,
        ttlSeconds: opts.ttl ? parseTtl(opts.ttl) : undefined,
        visibility,
      }, config.lifecycle);

      const policy = resolveVisibility(input);
      const memory = store.store({
        ...input,
        visibility: policy.visibility,
      });

      logger.info(`Memory stored: ${memory.id}`);
      logger.info(`  Type: ${memory.memoryType}`);
      logger.info(`  Visibility: ${memory.visibility}`);
      logger.info(`  Tags: ${memory.tags.join(", ") || "(none)"}`);

      if (policy.suggestion === "promote") {
        logger.info(
          "\n  Hint: This memory might be useful for the team. " +
            `Use 'unforgit promote ${memory.id}' to share it.`,
        );
      }
    } finally {
      store.close();
    }
  });
