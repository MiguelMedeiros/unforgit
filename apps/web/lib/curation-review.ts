export type ReviewableSuggestionStatus = "pending" | "approved" | "rejected" | "applied";

export interface DashboardSuggestion {
  id: string;
  type: string;
  priority: "high" | "medium" | "low";
  status?: ReviewableSuggestionStatus;
  memoryIds: string[];
  reason: string;
  confidence: number;
  createdBy?: string;
  reviewedBy?: string;
  reviewNote?: string;
  action?: {
    command: string;
    description: string;
  };
  payload?: {
    sourceSuggestionId?: unknown;
    action?: unknown;
  };
}

export interface SuggestionReviewPayload {
  id: string;
  status: Exclude<ReviewableSuggestionStatus, "pending">;
  reviewedBy: string;
  reviewNote?: string;
}

export interface DashboardEmbeddingStats {
  total: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
  coverage: number;
}

export function embeddingCoveragePercent(
  stats: DashboardEmbeddingStats | null,
): number {
  return stats && Number.isFinite(stats.coverage) ? stats.coverage * 100 : 0;
}

export function buildReviewPayload(
  id: string,
  status: Exclude<ReviewableSuggestionStatus, "pending">,
  reviewNote?: string,
  reviewedBy = "dashboard",
): SuggestionReviewPayload {
  const normalizedNote = reviewNote?.trim();
  return {
    id,
    status,
    reviewedBy,
    ...(normalizedNote ? { reviewNote: normalizedNote } : {}),
  };
}

export function getSuggestionAction(
  suggestion: DashboardSuggestion,
): DashboardSuggestion["action"] {
  if (suggestion.action) return suggestion.action;
  const action = suggestion.payload?.action;
  if (
    action &&
    typeof action === "object" &&
    "command" in action &&
    typeof action.command === "string" &&
    "description" in action &&
    typeof action.description === "string"
  ) {
    return { command: action.command, description: action.description };
  }
  return undefined;
}

export function getSuggestionProvenance(
  suggestion: DashboardSuggestion,
): { createdBy?: string; sourceSuggestionId?: string } {
  const sourceSuggestionId = suggestion.payload?.sourceSuggestionId;
  return {
    ...(suggestion.createdBy ? { createdBy: suggestion.createdBy } : {}),
    ...(typeof sourceSuggestionId === "string" ? { sourceSuggestionId } : {}),
  };
}

export function removeReviewedSuggestion<T extends { id: string }>(
  suggestions: T[],
  reviewedId: string,
): T[] {
  return suggestions.filter((suggestion) => suggestion.id !== reviewedId);
}
