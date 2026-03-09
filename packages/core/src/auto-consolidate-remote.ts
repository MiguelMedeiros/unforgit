import type { Memory, MemoryType } from "@unforgit/shared";
import type { IRemoteStore } from "@unforgit/shared";
import {
  generateConsolidatedText,
  memoriesToConsolidationInput,
} from "./llm.js";

export interface ConsolidationCandidate {
  memories: Memory[];
  reason: string;
  suggestedTags: string[];
  averageScore: number;
}

export interface AutoConsolidateOptions {
  threshold?: number;
  minGroupSize?: number;
  maxGroups?: number;
  types?: MemoryType[];
  excludeConsolidations?: boolean;
}

export interface AutoConsolidateResult {
  candidates: ConsolidationCandidate[];
  totalMemoriesScanned: number;
  totalCandidateGroups: number;
}

export interface ExecuteConsolidationOptions {
  apiKey?: string;
  model?: string;
  preserveOriginals?: boolean;
}

export interface ExecuteConsolidationResult {
  consolidatedId: string;
  sourceIds: string[];
  generatedText: string;
  suggestedTags: string[];
  memoryType: MemoryType;
}

export async function findConsolidationCandidatesRemote(
  store: IRemoteStore,
  orgId: string,
  repoId: string,
  options: AutoConsolidateOptions = {}
): Promise<AutoConsolidateResult> {
  const {
    threshold = 0.4,
    minGroupSize = 2,
    maxGroups = 10,
    types,
    excludeConsolidations = true,
  } = options;

  const memories = await store.list({
    orgId,
    repoId,
    status: ["active"],
    types,
    limit: 1000,
  });

  const filteredMemories = excludeConsolidations
    ? memories.filter((m) => {
        const sourceRefs = m.sourceRefs as Record<string, unknown> | undefined;
        return !sourceRefs?.consolidated_from;
      })
    : memories;

  if (filteredMemories.length < 2) {
    return {
      candidates: [],
      totalMemoriesScanned: filteredMemories.length,
      totalCandidateGroups: 0,
    };
  }

  const similarityScores = new Map<string, Map<string, number>>();
  const memoryMap = new Map(filteredMemories.map((m) => [m.id, m]));

  for (const memory of filteredMemories) {
    try {
      const similar = await store.findSimilar({
        orgId,
        repoId,
        memoryId: memory.id,
        threshold,
        k: 10,
      });

      for (const sim of similar) {
        const targetMemory = memoryMap.get(sim.id);
        if (!targetMemory) continue;

        const sourceRefs = targetMemory.sourceRefs as Record<string, unknown> | undefined;
        if (excludeConsolidations && sourceRefs?.consolidated_from) continue;

        if (!similarityScores.has(memory.id)) {
          similarityScores.set(memory.id, new Map());
        }
        similarityScores.get(memory.id)!.set(sim.id, sim.score);
      }
    } catch {
      continue;
    }
  }

  const used = new Set<string>();
  const groups: Array<{ ids: string[]; avgScore: number }> = [];

  const sortedMemories = [...filteredMemories].sort((a, b) => {
    const aCount = similarityScores.get(a.id)?.size ?? 0;
    const bCount = similarityScores.get(b.id)?.size ?? 0;
    return bCount - aCount;
  });

  for (const seed of sortedMemories) {
    if (used.has(seed.id)) continue;

    const seedSimilar = similarityScores.get(seed.id);
    if (!seedSimilar || seedSimilar.size === 0) continue;

    const group: string[] = [seed.id];
    let totalScore = 0;
    let scoreCount = 0;

    const candidates = Array.from(seedSimilar.entries())
      .filter(([id]) => !used.has(id))
      .sort((a, b) => b[1] - a[1]);

    for (const [candidateId, score] of candidates) {
      if (group.length >= 5) break;

      let isCompatible = true;
      for (const memberId of group) {
        if (memberId === seed.id) continue;

        const memberSimilar = similarityScores.get(memberId);
        const reverseScore = memberSimilar?.get(candidateId);
        const candidateSimilar = similarityScores.get(candidateId);
        const forwardScore = candidateSimilar?.get(memberId);

        const pairScore = Math.max(reverseScore ?? 0, forwardScore ?? 0);
        if (pairScore < threshold * 0.8) {
          isCompatible = false;
          break;
        }
      }

      if (isCompatible) {
        group.push(candidateId);
        totalScore += score;
        scoreCount++;
      }
    }

    if (group.length >= minGroupSize) {
      for (const id of group) {
        used.add(id);
      }
      groups.push({
        ids: group,
        avgScore: scoreCount > 0 ? totalScore / scoreCount : threshold,
      });
    }
  }

  const candidateResults: ConsolidationCandidate[] = [];

  for (const group of groups) {
    const groupMemories = group.ids
      .map((id) => memoryMap.get(id))
      .filter((m): m is Memory => m !== undefined);

    if (groupMemories.length < minGroupSize) continue;

    const allTags = new Set<string>();
    for (const m of groupMemories) {
      for (const tag of m.tags) {
        allTags.add(tag);
      }
    }

    const typeCount: Record<string, number> = {};
    for (const m of groupMemories) {
      typeCount[m.memoryType] = (typeCount[m.memoryType] || 0) + 1;
    }
    const dominantType = Object.entries(typeCount).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] as MemoryType | undefined;

    candidateResults.push({
      memories: groupMemories.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ),
      reason: `${groupMemories.length} similar ${dominantType ?? "mixed"} memories with avg similarity ${group.avgScore.toFixed(2)}`,
      suggestedTags: Array.from(allTags),
      averageScore: group.avgScore,
    });
  }

  candidateResults.sort((a, b) => {
    if (b.memories.length !== a.memories.length) {
      return b.memories.length - a.memories.length;
    }
    return b.averageScore - a.averageScore;
  });

  return {
    candidates: candidateResults.slice(0, maxGroups),
    totalMemoriesScanned: filteredMemories.length,
    totalCandidateGroups: candidateResults.length,
  };
}

export async function executeConsolidationRemote(
  store: IRemoteStore,
  candidate: ConsolidationCandidate,
  orgId: string,
  repoId: string,
  options: ExecuteConsolidationOptions = {}
): Promise<ExecuteConsolidationResult> {
  const { apiKey, model, preserveOriginals = true } = options;

  const input = memoriesToConsolidationInput(candidate.memories);

  const llmResult = await generateConsolidatedText(input, { apiKey, model });

  const sourceIds = candidate.memories.map((m) => m.id);

  const result = await store.consolidateMemories({
    orgId,
    repoId,
    sourceIds,
    consolidatedText: llmResult.text,
    memoryType: llmResult.suggestedType,
    tags: llmResult.suggestedTags,
    preserveOriginals,
  });

  return {
    consolidatedId: result.consolidatedId,
    sourceIds,
    generatedText: llmResult.text,
    suggestedTags: llmResult.suggestedTags,
    memoryType: llmResult.suggestedType,
  };
}

export async function autoConsolidateRemote(
  store: IRemoteStore,
  orgId: string,
  repoId: string,
  options: AutoConsolidateOptions & ExecuteConsolidationOptions = {}
): Promise<{
  executed: ExecuteConsolidationResult[];
  skipped: ConsolidationCandidate[];
  errors: Array<{ candidate: ConsolidationCandidate; error: string }>;
}> {
  const { candidates } = await findConsolidationCandidatesRemote(
    store,
    orgId,
    repoId,
    options
  );

  const executed: ExecuteConsolidationResult[] = [];
  const skipped: ConsolidationCandidate[] = [];
  const errors: Array<{ candidate: ConsolidationCandidate; error: string }> = [];

  for (const candidate of candidates) {
    try {
      const result = await executeConsolidationRemote(
        store,
        candidate,
        orgId,
        repoId,
        options
      );
      executed.push(result);
    } catch (err) {
      errors.push({
        candidate,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { executed, skipped, errors };
}

export function formatCandidatePreview(candidate: ConsolidationCandidate): string {
  const lines: string[] = [];
  lines.push(`Group: ${candidate.reason}`);
  lines.push(`Tags: ${candidate.suggestedTags.join(", ") || "none"}`);
  lines.push("Memories:");

  for (const mem of candidate.memories) {
    const preview = mem.text.length > 80 ? mem.text.slice(0, 80) + "..." : mem.text;
    lines.push(`  - [${mem.memoryType}] ${mem.id.slice(0, 8)}: ${preview}`);
  }

  return lines.join("\n");
}
