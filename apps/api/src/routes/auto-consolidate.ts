import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { RemoteStore } from "@unforgit/db";
import {
  isOpenAIConfigured,
  findConsolidationCandidatesRemote,
  executeConsolidationRemote,
  autoConsolidateRemote,
  formatCandidatePreview,
  type ConsolidationCandidate,
} from "@unforgit/core";

const previewSchema = z.object({
  orgId: z.string(),
  repoId: z.string(),
  threshold: z.number().min(0).max(1).default(0.4),
  minGroupSize: z.number().int().min(2).max(10).default(2),
  maxGroups: z.number().int().min(1).max(50).default(10),
  types: z
    .array(z.enum(["episodic", "semantic", "procedural"]))
    .optional(),
  excludeConsolidations: z.boolean().default(true),
});

const executeSchema = z.object({
  orgId: z.string(),
  repoId: z.string(),
  threshold: z.number().min(0).max(1).default(0.4),
  minGroupSize: z.number().int().min(2).max(10).default(2),
  maxGroups: z.number().int().min(1).max(20).default(5),
  types: z
    .array(z.enum(["episodic", "semantic", "procedural"]))
    .optional(),
  excludeConsolidations: z.boolean().default(true),
  preserveOriginals: z.boolean().default(true),
  model: z.string().optional(),
});

const executeGroupSchema = z.object({
  orgId: z.string(),
  repoId: z.string(),
  sourceIds: z.array(z.string()).min(2),
  preserveOriginals: z.boolean().default(true),
  model: z.string().optional(),
});

export async function autoConsolidateRoutes(
  app: FastifyInstance,
  store: RemoteStore
): Promise<void> {
  app.post("/v1/auto-consolidate/preview", async (request, reply) => {
    const parsed = previewSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const { orgId, repoId, ...options } = parsed.data;

    try {
      const result = await findConsolidationCandidatesRemote(
        store,
        orgId,
        repoId,
        options
      );

      const candidatesFormatted = result.candidates.map((c) => ({
        memoryIds: c.memories.map((m) => m.id),
        memoryCount: c.memories.length,
        reason: c.reason,
        suggestedTags: c.suggestedTags,
        averageScore: c.averageScore,
        preview: formatCandidatePreview(c),
        memories: c.memories.map((m) => ({
          id: m.id,
          memoryType: m.memoryType,
          text: m.text.slice(0, 200) + (m.text.length > 200 ? "..." : ""),
          tags: m.tags,
        })),
      }));

      return reply.send({
        candidates: candidatesFormatted,
        totalMemoriesScanned: result.totalMemoriesScanned,
        totalCandidateGroups: result.totalCandidateGroups,
        openAIConfigured: isOpenAIConfigured(),
      });
    } catch (error) {
      return reply.status(500).send({
        error: "Failed to find consolidation candidates",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/v1/auto-consolidate", async (request, reply) => {
    if (!isOpenAIConfigured()) {
      return reply.status(503).send({
        error: "OpenAI API key not configured on server",
        hint: "Set OPENAI_API_KEY environment variable for LLM-powered consolidation",
      });
    }

    const parsed = executeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const { orgId, repoId, model, preserveOriginals, ...options } = parsed.data;

    try {
      const result = await autoConsolidateRemote(store, orgId, repoId, {
        ...options,
        model: model ?? process.env.CONSOLIDATION_MODEL,
        preserveOriginals,
      });

      return reply.send({
        executed: result.executed.map((e) => ({
          consolidatedId: e.consolidatedId,
          sourceIds: e.sourceIds,
          generatedText: e.generatedText,
          suggestedTags: e.suggestedTags,
          memoryType: e.memoryType,
        })),
        executedCount: result.executed.length,
        errorCount: result.errors.length,
        errors: result.errors.map((e) => ({
          sourceIds: e.candidate.memories.map((m) => m.id),
          error: e.error,
        })),
      });
    } catch (error) {
      return reply.status(500).send({
        error: "Auto-consolidation failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/v1/auto-consolidate/execute", async (request, reply) => {
    if (!isOpenAIConfigured()) {
      return reply.status(503).send({
        error: "OpenAI API key not configured on server",
        hint: "Set OPENAI_API_KEY environment variable for LLM-powered consolidation",
      });
    }

    const parsed = executeGroupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const { orgId, repoId, sourceIds, preserveOriginals, model } = parsed.data;

    const memories = [];
    for (const id of sourceIds) {
      const memory = await store.getById(id);
      if (!memory) {
        return reply.status(404).send({ error: `Memory not found: ${id}` });
      }
      memories.push(memory);
    }

    const allTags = new Set<string>();
    for (const m of memories) {
      for (const tag of m.tags) {
        allTags.add(tag);
      }
    }

    const candidate: ConsolidationCandidate = {
      memories,
      reason: `Manual consolidation of ${memories.length} memories`,
      suggestedTags: Array.from(allTags),
      averageScore: 1.0,
    };

    try {
      const result = await executeConsolidationRemote(
        store,
        candidate,
        orgId,
        repoId,
        {
          model: model ?? process.env.CONSOLIDATION_MODEL,
          preserveOriginals,
        }
      );

      return reply.send({
        consolidatedId: result.consolidatedId,
        sourceIds: result.sourceIds,
        generatedText: result.generatedText,
        suggestedTags: result.suggestedTags,
        memoryType: result.memoryType,
      });
    } catch (error) {
      return reply.status(500).send({
        error: "Consolidation execution failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
