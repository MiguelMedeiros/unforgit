export type ReviewableSuggestionStatus = "pending" | "approved" | "rejected" | "applied";

export interface DashboardSuggestion {
  id: string;
  type: string;
  priority: "high" | "medium" | "low";
  status?: ReviewableSuggestionStatus;
  memoryIds: string[];
  reason: string;
  confidence: number;
  action?: {
    command: string;
    description: string;
  };
}

export interface SuggestionReviewPayload {
  id: string;
  status: Exclude<ReviewableSuggestionStatus, "pending">;
  reviewedBy: string;
  reviewNote?: string;
}

export function buildReviewPayload(
  id: string,
  status: Exclude<ReviewableSuggestionStatus, "pending">,
  reviewNote?: string,
  reviewedBy = "dashboard",
): SuggestionReviewPayload {
  return {
    id,
    status,
    reviewedBy,
    ...(reviewNote ? { reviewNote } : {}),
  };
}

export function removeReviewedSuggestion<T extends { id: string }>(
  suggestions: T[],
  reviewedId: string,
): T[] {
  return suggestions.filter((suggestion) => suggestion.id !== reviewedId);
}
