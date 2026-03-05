import type { MemoryType } from "./types.js";

export interface MemoryTemplate {
  name: string;
  description: string;
  memoryType: MemoryType;
  defaultTags: string[];
  prefix?: string;
  visibility: "private" | "repo" | "auto";
}

export const MEMORY_TEMPLATES: Record<string, MemoryTemplate> = {
  decision: {
    name: "Decision",
    description: "Technical or architectural decision",
    memoryType: "semantic",
    defaultTags: ["decision"],
    prefix: "Decision:",
    visibility: "repo",
  },
  adr: {
    name: "ADR",
    description: "Architecture Decision Record",
    memoryType: "semantic",
    defaultTags: ["adr", "architecture", "decision"],
    prefix: "ADR:",
    visibility: "repo",
  },
  gotcha: {
    name: "Gotcha",
    description: "Non-obvious issue or caveat discovered",
    memoryType: "episodic",
    defaultTags: ["gotcha", "warning"],
    prefix: "Gotcha:",
    visibility: "repo",
  },
  bug: {
    name: "Bug",
    description: "Bug found and fixed",
    memoryType: "episodic",
    defaultTags: ["bug", "fix"],
    prefix: "Bug:",
    visibility: "private",
  },
  playbook: {
    name: "Playbook",
    description: "Step-by-step procedure or workflow",
    memoryType: "procedural",
    defaultTags: ["playbook", "howto"],
    prefix: "Playbook:",
    visibility: "repo",
  },
  deploy: {
    name: "Deploy",
    description: "Deployment procedure or notes",
    memoryType: "procedural",
    defaultTags: ["deploy", "ops"],
    prefix: "Deploy:",
    visibility: "repo",
  },
  convention: {
    name: "Convention",
    description: "Coding convention or standard",
    memoryType: "semantic",
    defaultTags: ["convention", "standard"],
    prefix: "Convention:",
    visibility: "repo",
  },
  api: {
    name: "API",
    description: "API behavior or contract notes",
    memoryType: "semantic",
    defaultTags: ["api"],
    visibility: "repo",
  },
  workaround: {
    name: "Workaround",
    description: "Temporary workaround for an issue",
    memoryType: "episodic",
    defaultTags: ["workaround", "temporary"],
    prefix: "Workaround:",
    visibility: "private",
  },
  perf: {
    name: "Performance",
    description: "Performance finding or optimization",
    memoryType: "semantic",
    defaultTags: ["performance", "optimization"],
    prefix: "Perf:",
    visibility: "repo",
  },
  security: {
    name: "Security",
    description: "Security consideration or finding",
    memoryType: "semantic",
    defaultTags: ["security"],
    prefix: "Security:",
    visibility: "repo",
  },
};

export function getTemplate(name: string): MemoryTemplate | undefined {
  return MEMORY_TEMPLATES[name.toLowerCase()];
}

export function listTemplates(): MemoryTemplate[] {
  return Object.values(MEMORY_TEMPLATES);
}

export function applyTemplate(
  template: MemoryTemplate,
  text: string,
  additionalTags: string[] = []
): {
  text: string;
  memoryType: MemoryType;
  tags: string[];
  visibility: "private" | "repo" | "auto";
} {
  const finalText = template.prefix && !text.toLowerCase().startsWith(template.prefix.toLowerCase())
    ? `${template.prefix} ${text}`
    : text;

  const tags = [...new Set([...template.defaultTags, ...additionalTags])];

  return {
    text: finalText,
    memoryType: template.memoryType,
    tags,
    visibility: template.visibility,
  };
}

export function formatTemplateList(): string {
  const lines = ["Available templates:", ""];

  for (const [key, template] of Object.entries(MEMORY_TEMPLATES)) {
    lines.push(`  ${key.padEnd(12)} - ${template.description}`);
    lines.push(`                 Type: ${template.memoryType}, Tags: ${template.defaultTags.join(", ")}`);
  }

  return lines.join("\n");
}
