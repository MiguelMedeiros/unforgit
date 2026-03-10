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

export const lifecycleTtlConfigSchema = z.object({
  episodic: z.number().int().positive().optional(),
  semantic: z.number().int().positive().optional(),
  procedural: z.number().int().positive().optional(),
});

export const lifecycleUsageBoostSchema = z.object({
  enabled: z.boolean(),
  topKToRecord: z.number().int().positive(),
  minUsageCount: z.number().int().positive(),
  maxBoost: z.number().min(0).max(1),
  halfLifeDays: z.number().positive(),
});

export const lifecycleMaintenanceSchema = z.object({
  staleEpisodicDays: z.number().int().positive(),
  consolidationThreshold: z.number().min(0).max(1),
  consolidationMinGroupSize: z.number().int().min(2),
  consolidationMaxGroups: z.number().int().positive(),
  promoteRecallCount: z.number().int().positive(),
  pinRecallCount: z.number().int().positive(),
  dryRunDefault: z.boolean(),
  autoRunOnStore: z.boolean(),
  autoRunOnRecall: z.boolean(),
  debounceMs: z.number().int().positive(),
});

export const lifecycleConfigSchema = z.object({
  ttlSecondsByType: lifecycleTtlConfigSchema.optional(),
  usageBoost: lifecycleUsageBoostSchema.partial().optional(),
  maintenance: lifecycleMaintenanceSchema.partial().optional(),
});

const remoteConfigSchema = z.object({
  url: z.string(),
  orgId: z.string(),
  repoId: z.string(),
});

export const hippoConfigSchema = z.object({
  configVersion: z.number().optional(),
  remote: remoteConfigSchema,
  defaults: z.object({
    visibility: z.enum(["private", "repo", "auto"]),
    memoryType: z.enum(["episodic", "semantic", "procedural"]),
  }),
  sync: syncConfigSchema.optional(),
  embeddings: embeddingConfigSchema.optional(),
  lifecycle: lifecycleConfigSchema.optional(),
  remotes: z.record(z.string(), remoteConfigSchema).optional(),
});

const VALID_MEMORY_TYPES = ["episodic", "semantic", "procedural"] as const;

export function validateMemoryType(value: string): value is (typeof VALID_MEMORY_TYPES)[number] {
  return (VALID_MEMORY_TYPES as readonly string[]).includes(value);
}

export function parseConfidence(value: string): number {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n < 0 || n > 1) {
    throw new Error("--confidence must be a number between 0 and 1");
  }
  return n;
}

export function parseThreshold(value: string): number {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n < 0 || n > 1) {
    throw new Error("--threshold must be a number between 0 and 1");
  }
  return n;
}

export function parseTtl(value: string): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) {
    throw new Error("--ttl must be a positive integer (seconds)");
  }
  return n;
}

export function parsePositiveInt(value: string, name: string): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return n;
}
