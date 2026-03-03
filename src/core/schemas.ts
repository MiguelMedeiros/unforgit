import { z } from "zod";

export const memoryTypeSchema = z.enum(["episodic", "semantic", "procedural"]);

export const visibilitySchema = z.enum(["private", "repo", "auto"]);

export const statusSchema = z.enum(["active", "deprecated", "superseded", "deleted"]);

export const conflictResolutionSchema = z.enum(["local_wins", "remote_wins", "last_write_wins", "manual"]);

export const scopeTypeSchema = z.enum(["repo", "org"]);

export const createMemorySchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().min(1),
  repoId: z.string().min(1),
  memoryType: memoryTypeSchema,
  text: z.string().min(1),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  sourceRefs: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  ttlSeconds: z.number().int().positive().optional(),
  visibility: visibilitySchema.optional().default("auto"),
});

export const recallQuerySchema = z.object({
  orgId: z.string().min(1),
  repoId: z.string().min(1),
  query: z.string().min(1),
  types: z.array(memoryTypeSchema).optional(),
  tags: z.array(z.string()).optional(),
  timeRange: z
    .object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    })
    .optional(),
  k: z.number().int().min(1).max(100).optional().default(10),
  includeDeprecated: z.boolean().optional().default(false),
});

export const consolidateSchema = z.object({
  orgId: z.string().min(1),
  repoId: z.string().min(1),
  window: z
    .object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    })
    .optional(),
  lastN: z.number().int().positive().optional(),
  source: z
    .object({
      prUrl: z.string().optional(),
      commitSha: z.string().optional(),
    })
    .optional(),
});

export const supersedeSchema = z.object({
  newId: z.string().min(1),
});

export const deprecateSchema = z.object({
  reason: z.string().optional(),
});

export const linkTypeSchema = z.enum([
  "related_to",
  "derived_from",
  "contradicts",
  "depends_on",
]);

export const createLinkSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  linkType: linkTypeSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const linkQuerySchema = z.object({
  memoryId: z.string().min(1),
  linkType: linkTypeSchema.optional(),
});

export const deleteMemorySchema = z.object({
  deletedBy: z.string().optional(),
  hardDelete: z.boolean().optional().default(false),
});

export const syncQuerySchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  sinceVersion: z.number().int().optional(),
  conflictResolution: conflictResolutionSchema.optional().default("last_write_wins"),
  includeDeleted: z.boolean().optional().default(true),
});

export const tombstoneSchema = z.object({
  memoryId: z.string().uuid(),
  orgId: z.string().min(1),
  repoId: z.string().min(1),
  deletedAt: z.coerce.date(),
  deletedBy: z.string().optional(),
});
