import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { getDbPath, loadConfig } from "unforgit-config";
import { LocalStore } from "unforgit-db";
import {
  exportMarkdownMemories,
  findUnsafeMarkdownMemoryFindings,
  parseMarkdownMemories,
  shouldImportMarkdownMemory,
} from "unforgit-core";
import { logger } from "../logger.js";
import { EXIT_ERROR } from "../exit-codes.js";
import { isJsonMode, outputJson } from "../utils.js";
import type { MemoryType } from "unforgit-shared";

export const mdCommand = new Command("md")
  .description("Import and export markdown memory files such as CLAUDE.md and MEMORY.md");

function readMarkdownFile(file: string): string {
  if (!fs.existsSync(file)) {
    logger.error(`Markdown file not found: ${file}`);
    process.exit(EXIT_ERROR);
  }
  return fs.readFileSync(file, "utf-8");
}

function importMarkdown(file: string, opts: { dryRun?: boolean; apply?: boolean; json?: boolean }) {
  const config = loadConfig();
  const sourceFile = path.resolve(file);
  const markdown = readMarkdownFile(sourceFile);
  const parsed = parseMarkdownMemories(markdown, { sourceFile });
  const findings = findUnsafeMarkdownMemoryFindings(parsed);
  const importable = parsed.filter((memory) => shouldImportMarkdownMemory(memory, findings));
  const dryRun = !opts.apply;
  const storedIds: string[] = [];

  if (!dryRun) {
    const store = new LocalStore(getDbPath());
    try {
      const existing = store.list({
        orgId: config.remote.orgId || "local",
        repoId: config.remote.repoId || "local",
        status: ["active"],
        limit: 10_000,
      });
      const existingChecksums = new Set(
        existing
          .map((memory) => {
            const markdownSource = memory.sourceRefs?.markdown as { checksum?: string } | undefined;
            return markdownSource?.checksum;
          })
          .filter((checksum): checksum is string => Boolean(checksum)),
      );
      const existingTexts = new Set(existing.map((memory) => memory.text.trim().toLowerCase()));

      for (const memory of importable) {
        if (existingChecksums.has(memory.checksum) || existingTexts.has(memory.text.trim().toLowerCase())) {
          continue;
        }
        const stored = store.store({
          orgId: config.remote.orgId || "local",
          repoId: config.remote.repoId || "local",
          memoryType: memory.memoryType,
          text: memory.text,
          tags: memory.tags,
          sourceRefs: {
            markdown: {
              sourceFile,
              sourceId: memory.id,
              lineStart: memory.lineStart,
              lineEnd: memory.lineEnd,
              checksum: memory.checksum,
              headingPath: memory.headingPath,
            },
          },
        });
        storedIds.push(stored.id);
      }
    } finally {
      store.close();
    }
  }

  const payload = {
    file: sourceFile,
    parsed: parsed.length,
    importable: importable.length,
    skippedUnsafe: findings.length,
    stored: storedIds.length,
    dryRun,
    findings,
    storedIds,
  };

  if (opts.json || isJsonMode()) {
    outputJson(payload);
  } else {
    logger.info(`${dryRun ? "Would import" : "Imported"}: ${payload.stored || importable.length} memories`);
    logger.info(`Parsed: ${parsed.length}`);
    logger.info(`Skipped unsafe: ${findings.length}`);
    for (const finding of findings) logger.warn(`- ${finding.message}`);
  }
}

mdCommand
  .command("import")
  .description("Import a markdown memory file into Unforgit; dry-run by default")
  .argument("<file>", "Markdown file to import, for example CLAUDE.md or MEMORY.md")
  .option("--dry-run", "Preview import without writing memories")
  .option("--apply", "Store safe, non-duplicate parsed memories")
  .option("--json", "Output machine-readable JSON")
  .action((file, opts) => importMarkdown(file, opts));

mdCommand
  .command("scan")
  .description("Parse and safety-check a markdown memory file without writing")
  .argument("<file>", "Markdown file to scan")
  .option("--json", "Output machine-readable JSON")
  .action((file, opts) => importMarkdown(file, { ...opts, dryRun: true }));

mdCommand
  .command("export")
  .description("Export active Unforgit memories to a markdown memory file")
  .option("--format <format>", "Markdown flavor (claude|generic)", "generic")
  .option("--out <file>", "Output markdown path")
  .option("--tags <tags>", "Comma-separated tag filter")
  .option("--types <types>", "Comma-separated memory types")
  .option("--json", "Output machine-readable JSON")
  .action((opts) => {
    const config = loadConfig();
    const store = new LocalStore(getDbPath());
    const out = path.resolve(opts.out ?? (opts.format === "claude" ? "CLAUDE.md" : "MEMORY.md"));
    try {
      const types = opts.types
        ? opts.types.split(",").map((type: string) => type.trim()).filter(Boolean) as MemoryType[]
        : undefined;
      const tags = opts.tags
        ? opts.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean)
        : undefined;
      const memories = store.list({
        orgId: config.remote.orgId || "local",
        repoId: config.remote.repoId || "local",
        status: ["active"],
        types,
        tags,
        limit: 10_000,
      });
      const markdown = exportMarkdownMemories(
        memories.map((memory) => ({
          id: memory.id,
          text: memory.text,
          memoryType: memory.memoryType,
          tags: memory.tags,
        })),
        { format: opts.format === "claude" ? "claude" : "generic", title: path.basename(out) },
      );
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, markdown, "utf-8");
      const payload = { exported: memories.length, out, format: opts.format };
      if (opts.json || isJsonMode()) outputJson(payload);
      else logger.info(`Exported ${memories.length} memories to ${out}`);
    } finally {
      store.close();
    }
  });

mdCommand
  .command("doctor")
  .description("Check a markdown memory file for unsafe entries and importability")
  .argument("<file>", "Markdown file to inspect")
  .option("--json", "Output machine-readable JSON")
  .action((file, opts) => importMarkdown(file, { ...opts, dryRun: true }));
