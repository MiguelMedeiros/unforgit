import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";
import type { Memory, MemoryType } from "@/lib/types";

interface ConsolidationCandidate {
  memories: Memory[];
  reason: string;
  suggestedTags: string[];
  averageScore: number;
}

const memoryTypes: ReadonlySet<string> = new Set(["episodic", "semantic", "procedural"]);

function parseMemoryTypes(value: string | null): MemoryType[] | undefined {
  if (!value) return undefined;

  const types = value
    .split(",")
    .filter((type): type is MemoryType => memoryTypes.has(type));

  return types.length > 0 ? types : undefined;
}

function findConsolidationCandidates(
  store: ReturnType<typeof getLocalStore>,
  orgId: string,
  repoId: string,
  options: {
    threshold?: number;
    minGroupSize?: number;
    maxGroups?: number;
    offset?: number;
    types?: MemoryType[];
  } = {},
): {
  candidates: ConsolidationCandidate[];
  totalMemoriesScanned: number;
  totalCandidateGroups: number;
} {
  if (!store) {
    return { candidates: [], totalMemoriesScanned: 0, totalCandidateGroups: 0 };
  }

  const {
    threshold = 0.4,
    minGroupSize = 2,
    maxGroups = 10,
    offset = 0,
    types,
  } = options;

  const memories = store.list({
    orgId,
    repoId,
    status: ["active"],
    types,
    limit: 1000,
  });

  const filteredMemories = memories.filter((memory) => !memory.isConsolidation);

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
      const similar = store.findSimilar({
        orgId,
        repoId,
        memoryId: memory.id,
        threshold,
        k: 10,
      });

      for (const sim of similar) {
        const targetMemory = memoryMap.get(sim.id);
        if (!targetMemory) continue;
        if (targetMemory.isConsolidation) continue;

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

  const result: ConsolidationCandidate[] = [];

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
      (a, b) => b[1] - a[1],
    )[0]?.[0] ?? "mixed";

    result.push({
      memories: groupMemories.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      reason: `${groupMemories.length} similar ${dominantType} memories with avg similarity ${group.avgScore.toFixed(2)}`,
      suggestedTags: Array.from(allTags),
      averageScore: group.avgScore,
    });
  }

  result.sort((a, b) => {
    if (b.memories.length !== a.memories.length) {
      return b.memories.length - a.memories.length;
    }
    return b.averageScore - a.averageScore;
  });

  return {
    candidates: result.slice(offset, offset + maxGroups),
    totalMemoriesScanned: filteredMemories.length,
    totalCandidateGroups: result.length,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const config = getConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Unforgit not initialized" },
      { status: 500 },
    );
  }

  const store = getLocalStore();
  if (!store) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 },
    );
  }

  const threshold = parseFloat(params.get("threshold") ?? "0.4");
  const minGroupSize = parseInt(params.get("minGroupSize") ?? "2", 10);
  const maxGroups = parseInt(params.get("maxGroups") ?? "10", 10);
  const offset = parseInt(params.get("offset") ?? "0", 10);
  const types = parseMemoryTypes(params.get("types"));

  const result = findConsolidationCandidates(store, config.remote.orgId, config.remote.repoId, {
    threshold,
    minGroupSize,
    maxGroups,
    offset,
    types,
  });

  return NextResponse.json(result);
}
