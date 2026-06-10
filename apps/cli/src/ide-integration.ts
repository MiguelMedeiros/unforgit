import fs from "node:fs";
import path from "node:path";
import { logger } from "./logger.js";

export type IdeName = "cursor" | "claude" | "vscode" | "windsurf";

export const ALL_IDE_NAMES: IdeName[] = [
  "cursor",
  "claude",
  "vscode",
  "windsurf",
];

const UNFORGIT_MARKER = "Unforgit Memory Integration";

const MEMORY_INSTRUCTIONS = `# Unforgit Memory Integration

You have access to \`unforgit_recall\` and \`unforgit_add\` MCP tools for persistent repository memory across sessions.

## 1. Recall at the Start

At the **beginning of every conversation**, use the \`unforgit_recall\` tool with a query based on the user's first message to retrieve relevant context from past sessions.

Use recalled memories to avoid repeating past mistakes, follow known conventions, and apply previous decisions.

## 2. Save During the Conversation

Save memories **as soon as something noteworthy happens** — don't wait until the end.

Trigger a save with the \`unforgit_add\` tool immediately after:
- A bug is found and fixed
- An architectural or design decision is made
- A non-obvious gotcha or workaround is discovered
- A new convention or pattern is established
- A deployment/setup procedure is figured out

### Memory types

| Type | When | Example |
|------|------|---------|
| \`semantic\` | Decisions, conventions, architecture facts | "We use UTC timestamps everywhere" |
| \`procedural\` | Workflows, how-tos, playbooks | "To deploy: run make release, then kubectl apply" |
| \`episodic\` | Bugs found, gotchas, observations | "Found race condition in queue worker" |

### Rules

- Keep text concise but self-contained — a future reader should understand it without extra context
- Use meaningful tags for discoverability (e.g. \`["auth", "bug"]\`, \`["deploy", "playbook"]\`)
- Prefer \`semantic\` for stable facts, \`procedural\` for how-tos, \`episodic\` for transient observations
- Do NOT save trivial changes, obvious things, or info already in the codebase docs
- Quality over quantity — only save what's genuinely useful for future sessions
- **Always write memory text in English**, regardless of the language the user is speaking`;

interface SetupAction {
  path: string;
  action: "created" | "updated" | "exists";
}

interface IdeSetupResult {
  ide: IdeName;
  rules?: SetupAction;
  mcp?: SetupAction;
}

function upsertJsonMcp(
  filePath: string,
  serverKey: string,
  mcpEntry: Record<string, unknown>,
): SetupAction {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const fd = fs.openSync(filePath, "a+");
  try {
    const raw = fs.readFileSync(fd, "utf-8");
    if (raw.trim().length === 0) {
      const config = { [serverKey]: { unforgit: mcpEntry } };
      fs.writeSync(fd, JSON.stringify(config, null, 2) + "\n", 0, "utf-8");
      return { path: filePath, action: "created" };
    }

    const existing = JSON.parse(raw);
    const servers = existing[serverKey];
    if (servers?.unforgit) {
      return { path: filePath, action: "exists" };
    }

    existing[serverKey] = existing[serverKey] || {};
    existing[serverKey].unforgit = mcpEntry;
    fs.ftruncateSync(fd, 0);
    fs.writeSync(fd, JSON.stringify(existing, null, 2) + "\n", 0, "utf-8");
    return { path: filePath, action: "updated" };
  } finally {
    fs.closeSync(fd);
  }
}

function appendOrCreateMarkdown(
  filePath: string,
  content: string,
): SetupAction {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const fd = fs.openSync(filePath, "a+");
  try {
    const existing = fs.readFileSync(fd, "utf-8");
    if (existing.length === 0) {
      fs.writeSync(fd, content + "\n", 0, "utf-8");
      return { path: filePath, action: "created" };
    }

    if (existing.includes(UNFORGIT_MARKER)) {
      return { path: filePath, action: "exists" };
    }

    const separator = existing.endsWith("\n") ? "\n" : "\n\n";
    fs.writeSync(fd, separator + content + "\n", undefined, "utf-8");
    return { path: filePath, action: "updated" };
  } finally {
    fs.closeSync(fd);
  }
}

function replaceMarkdownIfMissingMarker(
  filePath: string,
  content: string,
): SetupAction {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const fd = fs.openSync(filePath, "a+");
  try {
    const existing = fs.readFileSync(fd, "utf-8");
    if (existing.includes(UNFORGIT_MARKER)) {
      return { path: filePath, action: "exists" };
    }

    fs.ftruncateSync(fd, 0);
    fs.writeSync(fd, content, 0, "utf-8");
    return { path: filePath, action: existing.length === 0 ? "created" : "updated" };
  } finally {
    fs.closeSync(fd);
  }
}

// --- Cursor ---

const CURSOR_RULE_CONTENT = `---
description: Auto-manage repository memory with Unforgit via MCP tools
alwaysApply: true
---

${MEMORY_INSTRUCTIONS}
`;

function setupCursor(cwd: string): IdeSetupResult {
  const rulesDir = path.join(cwd, ".cursor", "rules");
  const rulePath = path.join(rulesDir, "unforgit-memory.mdc");
  const rules = replaceMarkdownIfMissingMarker(rulePath, CURSOR_RULE_CONTENT);

  const mcpPath = path.join(cwd, ".cursor", "mcp.json");
  const mcp = upsertJsonMcp(mcpPath, "mcpServers", {
    command: "unforgit-mcp",
    args: [],
  });

  return { ide: "cursor", rules, mcp };
}

// --- Claude Code ---

function setupClaude(cwd: string): IdeSetupResult {
  const claudeMdPath = path.join(cwd, "CLAUDE.md");
  const rules = appendOrCreateMarkdown(claudeMdPath, MEMORY_INSTRUCTIONS);

  const mcpPath = path.join(cwd, ".mcp.json");
  const mcp = upsertJsonMcp(mcpPath, "mcpServers", {
    command: "unforgit-mcp",
    args: [],
  });

  return { ide: "claude", rules, mcp };
}

// --- VS Code (GitHub Copilot) ---

function setupVscode(cwd: string): IdeSetupResult {
  const instructionsPath = path.join(
    cwd,
    ".github",
    "copilot-instructions.md",
  );
  const rules = appendOrCreateMarkdown(instructionsPath, MEMORY_INSTRUCTIONS);

  const mcpPath = path.join(cwd, ".vscode", "mcp.json");
  const mcp = upsertJsonMcp(mcpPath, "servers", {
    type: "stdio",
    command: "unforgit-mcp",
  });

  return { ide: "vscode", rules, mcp };
}

// --- Windsurf ---

const WINDSURF_RULE_CONTENT = `${MEMORY_INSTRUCTIONS}
`;

function setupWindsurf(cwd: string): IdeSetupResult {
  const rulesPath = path.join(cwd, ".windsurfrules");
  const rules = appendOrCreateMarkdown(rulesPath, WINDSURF_RULE_CONTENT);

  const mcpPath = path.join(cwd, ".windsurf", "mcp.json");
  const mcp = upsertJsonMcp(mcpPath, "mcpServers", {
    command: "unforgit-mcp",
    args: [],
  });

  return { ide: "windsurf", rules, mcp };
}

// --- Detection ---

const IDE_INDICATORS: Record<IdeName, string[]> = {
  cursor: [".cursor"],
  claude: ["CLAUDE.md", ".claude"],
  vscode: [".vscode"],
  windsurf: [".windsurf", ".windsurfrules"],
};

export function detectIdes(cwd: string): IdeName[] {
  const detected: IdeName[] = [];
  for (const [ide, indicators] of Object.entries(IDE_INDICATORS)) {
    for (const indicator of indicators) {
      if (fs.existsSync(path.join(cwd, indicator))) {
        detected.push(ide as IdeName);
        break;
      }
    }
  }
  return detected;
}

const IDE_HANDLERS: Record<IdeName, (cwd: string) => IdeSetupResult> = {
  cursor: setupCursor,
  claude: setupClaude,
  vscode: setupVscode,
  windsurf: setupWindsurf,
};

const IDE_LABELS: Record<IdeName, string> = {
  cursor: "Cursor",
  claude: "Claude Code",
  vscode: "VS Code (Copilot)",
  windsurf: "Windsurf",
};

export function setupIdes(cwd: string, ides: IdeName[]): IdeSetupResult[] {
  const results: IdeSetupResult[] = [];
  for (const ide of ides) {
    const handler = IDE_HANDLERS[ide];
    const result = handler(cwd);
    results.push(result);
  }
  return results;
}

export function logIdeResults(results: IdeSetupResult[]): void {
  if (results.length === 0) {
    logger.info("  IDE integration: skipped");
    return;
  }

  for (const result of results) {
    const label = IDE_LABELS[result.ide];
    logger.info(`  ${label}:`);
    if (result.rules) {
      const verb =
        result.rules.action === "exists" ? "already exists" : result.rules.action;
      logger.info(`    Rules: ${verb} → ${result.rules.path}`);
    }
    if (result.mcp) {
      const verb =
        result.mcp.action === "exists" ? "already configured" : result.mcp.action;
      logger.info(`    MCP:   ${verb} → ${result.mcp.path}`);
    }
  }
}

export function parseIdeOption(value: string): IdeName[] {
  if (value === "all") return [...ALL_IDE_NAMES];
  const names = value.split(",").map((s) => s.trim().toLowerCase());
  const valid: IdeName[] = [];
  for (const name of names) {
    if (ALL_IDE_NAMES.includes(name as IdeName)) {
      valid.push(name as IdeName);
    } else {
      logger.warn(`Unknown IDE: "${name}". Valid options: ${ALL_IDE_NAMES.join(", ")}`);
    }
  }
  return valid;
}

export { CURSOR_RULE_CONTENT };
