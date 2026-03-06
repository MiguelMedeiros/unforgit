import { z } from "zod";

export const syncConfigSchema = z.object({
  enabled: z.boolean(),
  intervalMs: z.number().positive(),
  debounceMs: z.number().nonnegative(),
  autoResolveConflicts: z.enum([
    "last_write_wins",
    "local_wins",
    "remote_wins",
    "manual",
  ]),
});

export const embeddingConfigSchema = z.object({
  enabled: z.boolean(),
  model: z.string(),
  autoGenerate: z.boolean(),
});

export const hippoConfigSchema = z.object({
  configVersion: z.number().optional(),
  remote: z.object({
    url: z.string(),
    orgId: z.string(),
    repoId: z.string(),
    apiKey: z.string().optional(),
  }),
  defaults: z.object({
    visibility: z.enum(["private", "repo", "auto"]),
    memoryType: z.enum(["episodic", "semantic", "procedural"]),
  }),
  sync: syncConfigSchema.optional(),
  embeddings: embeddingConfigSchema.optional(),
});

const VALID_MEMORY_TYPES = ["episodic", "semantic", "procedural"] as const;

export function validateMemoryType(value: string): value is (typeof VALID_MEMORY_TYPES)[number] {
  return (VALID_MEMORY_TYPES as readonly string[]).includes(value);
}

export function parseConfidence(value: string): number {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n < 0 || n > 1) {
    console.error("error: --confidence must be a number between 0 and 1");
    process.exit(1);
  }
  return n;
}

export function parseTtl(value: string): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) {
    console.error("error: --ttl must be a positive integer (seconds)");
    process.exit(1);
  }
  return n;
}

export function parsePositiveInt(value: string, name: string): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) {
    console.error(`error: --${name} must be a positive integer`);
    process.exit(1);
  }
  return n;
}
