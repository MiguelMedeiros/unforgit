import type { Memory } from "./types.js";

export interface QualityFactors {
  textQuality: number;
  recallCount: number;
  consolidationStatus: number;
  age: number;
  hasLinks: number;
  hasTags: number;
  hasEmbedding: number;
}

export interface QualityScore {
  overall: number;
  factors: QualityFactors;
  suggestions: string[];
}

export interface MemoryStats {
  recallCount: number;
  linkCount: number;
  hasEmbedding: boolean;
  daysSinceCreation: number;
  daysSinceLastRecall: number | null;
}

const QUALITY_WEIGHTS = {
  textQuality: 0.20,
  recallCount: 0.25,
  consolidationStatus: 0.10,
  age: 0.15,
  hasLinks: 0.10,
  hasTags: 0.10,
  hasEmbedding: 0.10,
};

export function computeTextQuality(text: string): number {
  const length = text.trim().length;

  if (length < 20) return 0.2;
  if (length < 50) return 0.4;
  if (length < 100) return 0.6;
  if (length < 300) return 0.9;
  if (length < 500) return 1.0;
  if (length < 1000) return 0.9;
  return 0.7;
}

export function computeRecallScore(recallCount: number): number {
  if (recallCount === 0) return 0;
  if (recallCount < 3) return 0.3;
  if (recallCount < 10) return 0.6;
  if (recallCount < 25) return 0.8;
  return 1.0;
}

export function computeAgeScore(daysSinceCreation: number, daysSinceLastRecall: number | null): number {
  if (daysSinceLastRecall !== null && daysSinceLastRecall < 7) {
    return 1.0;
  }

  if (daysSinceCreation < 7) return 1.0;
  if (daysSinceCreation < 30) return 0.9;
  if (daysSinceCreation < 90) return 0.7;
  if (daysSinceCreation < 180) return 0.5;
  if (daysSinceCreation < 365) return 0.3;
  return 0.1;
}

export function computeConsolidationScore(memory: Memory): number {
  if (memory.isConsolidation) return 1.0;
  if (memory.status === "superseded") return 0.3;
  if (memory.status === "deprecated") return 0.1;
  return 0.7;
}

export function computeQualityScore(memory: Memory, stats: MemoryStats): QualityScore {
  const factors: QualityFactors = {
    textQuality: computeTextQuality(memory.text),
    recallCount: computeRecallScore(stats.recallCount),
    consolidationStatus: computeConsolidationScore(memory),
    age: computeAgeScore(stats.daysSinceCreation, stats.daysSinceLastRecall),
    hasLinks: stats.linkCount > 0 ? 1.0 : 0.3,
    hasTags: memory.tags.length > 0 ? 1.0 : 0.3,
    hasEmbedding: stats.hasEmbedding ? 1.0 : 0.5,
  };

  const overall =
    factors.textQuality * QUALITY_WEIGHTS.textQuality +
    factors.recallCount * QUALITY_WEIGHTS.recallCount +
    factors.consolidationStatus * QUALITY_WEIGHTS.consolidationStatus +
    factors.age * QUALITY_WEIGHTS.age +
    factors.hasLinks * QUALITY_WEIGHTS.hasLinks +
    factors.hasTags * QUALITY_WEIGHTS.hasTags +
    factors.hasEmbedding * QUALITY_WEIGHTS.hasEmbedding;

  const suggestions: string[] = [];

  if (factors.textQuality < 0.5) {
    suggestions.push("Consider expanding this memory with more detail");
  }
  if (factors.recallCount < 0.3 && stats.daysSinceCreation > 30) {
    suggestions.push("This memory has never been recalled - consider deprecating if no longer relevant");
  }
  if (factors.hasLinks < 0.5) {
    suggestions.push("Consider linking this memory to related memories");
  }
  if (factors.hasTags < 0.5) {
    suggestions.push("Add tags to improve discoverability");
  }
  if (!stats.hasEmbedding) {
    suggestions.push("Generate embedding for better semantic search");
  }
  if (stats.daysSinceCreation > 180 && stats.daysSinceLastRecall === null) {
    suggestions.push("Old memory with no recalls - review for deprecation");
  }

  return {
    overall: Math.round(overall * 100) / 100,
    factors,
    suggestions,
  };
}

export function getHealthStatus(score: number): "healthy" | "needs_attention" | "critical" {
  if (score >= 0.7) return "healthy";
  if (score >= 0.4) return "needs_attention";
  return "critical";
}

export interface RepositoryHealth {
  overallScore: number;
  status: "healthy" | "needs_attention" | "critical";
  memoryCounts: {
    total: number;
    healthy: number;
    needs_attention: number;
    critical: number;
  };
  topIssues: Array<{
    type: string;
    count: number;
    description: string;
  }>;
}

export function computeRepositoryHealth(
  memories: Array<{ memory: Memory; stats: MemoryStats }>
): RepositoryHealth {
  if (memories.length === 0) {
    return {
      overallScore: 1.0,
      status: "healthy",
      memoryCounts: { total: 0, healthy: 0, needs_attention: 0, critical: 0 },
      topIssues: [],
    };
  }

  const scores = memories.map(({ memory, stats }) =>
    computeQualityScore(memory, stats)
  );

  const totalScore = scores.reduce((sum, s) => sum + s.overall, 0);
  const overallScore = Math.round((totalScore / scores.length) * 100) / 100;

  const counts = { healthy: 0, needs_attention: 0, critical: 0 };
  for (const score of scores) {
    const status = getHealthStatus(score.overall);
    counts[status]++;
  }

  const issueCount: Record<string, number> = {};
  for (const score of scores) {
    for (const suggestion of score.suggestions) {
      issueCount[suggestion] = (issueCount[suggestion] || 0) + 1;
    }
  }

  const topIssues = Object.entries(issueCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([description, count]) => ({
      type: categorizeIssue(description),
      count,
      description,
    }));

  return {
    overallScore,
    status: getHealthStatus(overallScore),
    memoryCounts: {
      total: memories.length,
      ...counts,
    },
    topIssues,
  };
}

function categorizeIssue(description: string): string {
  if (description.includes("tag")) return "tagging";
  if (description.includes("link")) return "linking";
  if (description.includes("embedding")) return "embedding";
  if (description.includes("deprecat") || description.includes("recall")) return "maintenance";
  if (description.includes("detail") || description.includes("expand")) return "content";
  return "other";
}
