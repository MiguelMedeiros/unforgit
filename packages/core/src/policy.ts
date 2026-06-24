import type { CreateMemoryInput, PolicyResult } from "unforgit-shared";

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /api[_-]?key/i,
  /token/i,
  /credential/i,
  /private[_-]?key/i,
  /authorization\s*[:=]/i,
  /bearer\s+[A-Za-z0-9._~+/=-]+/i,
  /-----BEGIN/,
];

const RULE_LIKE_TAGS = new Set([
  "decision",
  "adr",
  "playbook",
  "gotcha",
  "convention",
  "rule",
  "standard",
  "process",
  "checklist",
]);

function containsSensitive(text: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}

function hasRuleLikeTags(tags: string[]): boolean {
  return tags.some((t) => RULE_LIKE_TAGS.has(t.toLowerCase()));
}

export function resolveVisibility(input: CreateMemoryInput): PolicyResult {
  if (containsSensitive(input.text)) {
    return { visibility: "private" };
  }

  if (
    input.memoryType === "episodic" &&
    !input.sourceRefs
  ) {
    return { visibility: "private" };
  }

  const hasSource = input.sourceRefs && Object.keys(input.sourceRefs).length > 0;
  const tags = input.tags ?? [];

  if (
    (input.memoryType === "semantic" || input.memoryType === "procedural") &&
    (hasSource || hasRuleLikeTags(tags))
  ) {
    return { visibility: "repo" };
  }

  return { visibility: "private", suggestion: "promote" };
}
