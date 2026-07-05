import { createHash } from "node:crypto";
import type { MemoryType } from "unforgit-shared";

export interface ParseMarkdownMemoriesOptions {
  sourceFile: string;
}

export interface ParsedMarkdownMemory {
  id?: string;
  text: string;
  memoryType: MemoryType;
  tags: string[];
  headingPath: string[];
  sourceFile: string;
  lineStart: number;
  lineEnd: number;
  checksum: string;
}

export interface MarkdownUnsafeFinding {
  checksum: string;
  reason: "possible-secret" | "prompt-injection";
  severity: "error" | "warn";
  message: string;
}

export interface ExportableMarkdownMemory {
  id: string;
  text: string;
  memoryType: MemoryType;
  tags: string[];
}

export interface ExportMarkdownMemoriesOptions {
  format?: "claude" | "generic";
  title?: string;
}

interface PendingMetadata {
  id?: string;
  memoryType?: MemoryType;
  tags?: string[];
}

const HEADING_TAGS: Array<[RegExp, string]> = [
  [/conventions?/i, "convention"],
  [/gotchas?|warnings?|pitfalls?/i, "gotcha"],
  [/playbooks?|procedures?|workflows?|commands?/i, "playbook"],
  [/decisions?/i, "decision"],
  [/architecture/i, "architecture"],
];

const SECRET_PATTERNS = [
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\b(?:sk|pk)_[A-Za-z0-9]{20,}\b/,
  /\b(?:token|secret|password)\s+(?:is|:)\s+\S+/i,
  /\b[A-Za-z0-9_]*SECRET[A-Za-z0-9_]*\s*=\s*\S+/i,
  /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/,
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore (?:all )?(?:previous|prior) instructions/i,
  /reveal (?:all )?(?:secrets|tokens|keys)/i,
  /system prompt/i,
];

function checksumFor(text: string): string {
  return createHash("sha256").update(text.trim(), "utf8").digest("hex");
}

function isTagChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 97 && code <= 122) ||
    (code >= 48 && code <= 57) ||
    char === "_" ||
    char === "-"
  );
}

function normalizeTag(tag: string): string {
  const slug = tag
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => isTagChar(char) ? char : "-")
    .join("");
  let start = 0;
  let end = slug.length;
  while (start < end && slug[start] === "-") start += 1;
  while (end > start && slug[end - 1] === "-") end -= 1;
  return slug.slice(start, end);
}

function uniqueTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map(normalizeTag).filter(Boolean)));
}

function inferType(headingPath: string[], text: string, explicit?: MemoryType): MemoryType {
  if (explicit) return explicit;
  const haystack = `${headingPath.join(" ")} ${text}`;
  if (/playbooks?|procedures?|workflows?|commands?|\bto\s+\w+[,，:]?\s+run\b/i.test(haystack)) {
    return "procedural";
  }
  if (/incidents?|bugs?|found|fixed|session|today|yesterday/i.test(haystack)) {
    return "episodic";
  }
  return "semantic";
}

function inferTags(headingPath: string[], explicitTags: string[] = []): string[] {
  const tags = [...explicitTags];
  for (const heading of headingPath) {
    for (const [pattern, tag] of HEADING_TAGS) {
      if (pattern.test(heading)) tags.push(tag);
    }
  }
  return uniqueTags(tags);
}

function parseMetadata(line: string): PendingMetadata | undefined {
  const match = line.match(/<!--\s*unforgit:([^>]*)-->/i);
  if (!match) return undefined;
  const metadata: PendingMetadata = {};
  const body = match[1];
  for (const part of body.split(/\s+/).filter(Boolean)) {
    const [key, rawValue] = part.split("=");
    const value = rawValue?.trim();
    if (!value) continue;
    if (key === "id") metadata.id = value;
    if (key === "type" && ["episodic", "semantic", "procedural"].includes(value)) {
      metadata.memoryType = value as MemoryType;
    }
    if (key === "tags") metadata.tags = value.split(",").map((tag) => tag.trim());
  }
  return metadata;
}

function stripBullet(line: string): string | undefined {
  const match = line.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.+?)\s*$/);
  return match?.[1]?.trim();
}

function headingLevel(line: string): { level: number; text: string } | undefined {
  const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
  if (!match) return undefined;
  return { level: match[1].length, text: match[2].trim() };
}

export function parseMarkdownMemories(
  markdown: string,
  options: ParseMarkdownMemoriesOptions,
): ParsedMarkdownMemory[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headings: Array<{ level: number; text: string }> = [];
  const memories: ParsedMarkdownMemory[] = [];
  let pendingMetadata: PendingMetadata | undefined;
  let inFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = headingLevel(line);
    if (heading) {
      while (headings.length > 0 && headings[headings.length - 1].level >= heading.level) {
        headings.pop();
      }
      headings.push(heading);
      pendingMetadata = undefined;
      continue;
    }

    const metadata = parseMetadata(line);
    if (metadata) {
      pendingMetadata = metadata;
      continue;
    }

    const text = stripBullet(line);
    if (!text) continue;

    const headingPath = headings.map((h) => h.text);
    const memoryType = inferType(headingPath, text, pendingMetadata?.memoryType);
    const tags = inferTags(headingPath, pendingMetadata?.tags);
    memories.push({
      id: pendingMetadata?.id,
      text,
      memoryType,
      tags,
      headingPath,
      sourceFile: options.sourceFile,
      lineStart: i + 1,
      lineEnd: i + 1,
      checksum: checksumFor(text),
    });
    pendingMetadata = undefined;
  }

  return memories;
}

export function findUnsafeMarkdownMemoryFindings(
  memories: ParsedMarkdownMemory[],
): MarkdownUnsafeFinding[] {
  const findings: MarkdownUnsafeFinding[] = [];
  for (const memory of memories) {
    if (SECRET_PATTERNS.some((pattern) => pattern.test(memory.text))) {
      findings.push({
        checksum: memory.checksum,
        reason: "possible-secret",
        severity: "error",
        message: `Possible secret in ${memory.sourceFile}:${memory.lineStart}`,
      });
    }
    if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(memory.text))) {
      findings.push({
        checksum: memory.checksum,
        reason: "prompt-injection",
        severity: "warn",
        message: `Prompt-injection-like instruction in ${memory.sourceFile}:${memory.lineStart}`,
      });
    }
  }
  return findings;
}

export function shouldImportMarkdownMemory(
  memory: ParsedMarkdownMemory,
  findings: MarkdownUnsafeFinding[],
): boolean {
  return !findings.some((finding) => finding.checksum === memory.checksum);
}

function sectionFor(memory: ExportableMarkdownMemory): string {
  if (memory.memoryType === "procedural" || memory.tags.includes("playbook")) return "Playbooks";
  if (memory.tags.includes("gotcha")) return "Gotchas";
  if (memory.tags.includes("decision")) return "Decisions";
  return "Conventions";
}

function sortExportMemories(a: ExportableMarkdownMemory, b: ExportableMarkdownMemory): number {
  const section = sectionFor(a).localeCompare(sectionFor(b));
  if (section !== 0) return section;
  return a.id.localeCompare(b.id);
}

export function exportMarkdownMemories(
  memories: ExportableMarkdownMemory[],
  options: ExportMarkdownMemoriesOptions = {},
): string {
  const title = options.title ?? (options.format === "claude" ? "CLAUDE.md" : "Memory");
  const sorted = [...memories].sort(sortExportMemories);
  const lines = [
    `# ${title}`,
    "",
    "Generated from Unforgit. Edit carefully; run `unforgit md sync` to import reviewed changes.",
    "",
  ];

  let currentSection = "";
  for (const memory of sorted) {
    const section = sectionFor(memory);
    if (section !== currentSection) {
      if (currentSection) lines.push("");
      lines.push(`## ${section}`, "");
      currentSection = section;
    }
    const tags = uniqueTags(memory.tags);
    lines.push(
      `<!-- unforgit:id=${memory.id} type=${memory.memoryType} tags=${tags.join(",")} -->`,
      `- ${memory.text}`,
    );
  }

  return `${lines.join("\n")}\n`;
}
