import type { RecallResult } from "./types.js";

function recencyScore(createdAt: Date): number {
  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - ageDays / 365);
}

export function rankResults(results: RecallResult[]): RecallResult[] {
  return results.sort((a, b) => b.score - a.score);
}

export function computeCompositeScore(
  textScore: number,
  createdAt: Date,
  confidence?: number,
): number {
  const recency = recencyScore(createdAt);
  const conf = confidence ?? 0.5;
  return textScore * 0.6 + recency * 0.2 + conf * 0.2;
}

export function deduplicateResults(results: RecallResult[]): RecallResult[] {
  const seen = new Map<string, RecallResult>();
  for (const r of results) {
    const existing = seen.get(r.id);
    if (!existing || r.score > existing.score) {
      seen.set(r.id, r);
    }
  }
  return Array.from(seen.values());
}

export function mergeAndRank(
  localResults: RecallResult[],
  remoteResults: RecallResult[],
  k: number,
): RecallResult[] {
  const all = [...localResults, ...remoteResults];
  const deduped = deduplicateResults(all);
  const ranked = rankResults(deduped);
  return ranked.slice(0, k);
}
