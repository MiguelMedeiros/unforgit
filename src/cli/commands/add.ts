import { Command } from "commander";
import { loadConfig, getDbPath } from "../config.js";
import { LocalStore } from "../../db/local.js";
import { resolveVisibility } from "../../core/policy.js";
import type { MemoryType } from "../../core/types.js";
import { getTemplate, applyTemplate, formatTemplateList } from "../../core/templates.js";

export const addCommand = new Command("add")
  .description("Add a memory (local by default)")
  .argument("<text>", "Memory text content")
  .option(
    "-t, --type <type>",
    "Memory type (episodic|semantic|procedural)",
    "episodic",
  )
  .option("--tags <tags>", "Comma-separated tags", "")
  .option(
    "--visibility <visibility>",
    "Visibility (private|repo|auto)",
    "auto",
  )
  .option("--source-pr <url>", "Source PR URL")
  .option("--source-commit <sha>", "Source commit SHA")
  .option("--confidence <n>", "Confidence score 0-1")
  .option("--ttl <seconds>", "TTL in seconds")
  .option("--template <name>", "Use a template (decision, gotcha, playbook, etc.)")
  .option("--list-templates", "List available templates")
  .action((text, opts) => {
    if (opts.listTemplates) {
      console.log(formatTemplateList());
      return;
    }

    const config = loadConfig();
    const store = new LocalStore(getDbPath());

    let userTags = opts.tags
      ? opts.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    let memoryType = opts.type as MemoryType;
    let memoryText = text;
    let visibility = opts.visibility;

    if (opts.template) {
      const template = getTemplate(opts.template);
      if (!template) {
        console.error(`Unknown template: ${opts.template}`);
        console.log("\n" + formatTemplateList());
        process.exit(1);
      }

      const applied = applyTemplate(template, text, userTags);
      memoryText = applied.text;
      memoryType = applied.memoryType;
      userTags = applied.tags;
      if (visibility === "auto") {
        visibility = applied.visibility;
      }

      console.log(`Using template: ${template.name}`);
    }

    const sourceRefs: Record<string, unknown> = {};
    if (opts.sourcePr) sourceRefs.pr_url = opts.sourcePr;
    if (opts.sourceCommit) sourceRefs.commit_sha = opts.sourceCommit;

    const input = {
      orgId: config.remote.orgId || "local",
      repoId: config.remote.repoId || "local",
      memoryType,
      text: memoryText,
      tags: userTags,
      sourceRefs: Object.keys(sourceRefs).length > 0 ? sourceRefs : undefined,
      confidence: opts.confidence ? parseFloat(opts.confidence) : undefined,
      ttlSeconds: opts.ttl ? parseInt(opts.ttl, 10) : undefined,
      visibility,
    };

    const policy = resolveVisibility(input);
    const memory = store.store({
      ...input,
      visibility: policy.visibility,
    });

    console.log(`Memory stored: ${memory.id}`);
    console.log(`  Type: ${memory.memoryType}`);
    console.log(`  Visibility: ${memory.visibility}`);
    console.log(`  Tags: ${memory.tags.join(", ") || "(none)"}`);

    if (policy.suggestion === "promote") {
      console.log(
        "\n  Hint: This memory might be useful for the team. " +
          `Use 'hippo promote ${memory.id}' to share it.`,
      );
    }

    store.close();
  });
