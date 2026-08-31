import { describe, expect, it } from "vitest";
import {
  buildReviewPayload,
  embeddingCoveragePercent,
  getSuggestionAction,
  getSuggestionProvenance,
  removeReviewedSuggestion,
  type DashboardSuggestion,
} from "../../lib/curation-review";

const pendingSuggestion: DashboardSuggestion = {
  id: "suggestion-1",
  type: "add_links",
  priority: "medium",
  status: "pending",
  memoryIds: ["mem-a", "mem-b"],
  reason: "Two memories should be linked",
  confidence: 0.82,
  createdBy: "dashboard",
  payload: {
    sourceSuggestionId: "add-links-batch",
    action: {
      command: "unforgit web",
      description: "Open graph view to create links",
    },
  },
};

describe("curation review helpers", () => {
  it("builds review API payloads with reviewer provenance", () => {
    expect(buildReviewPayload(pendingSuggestion.id, "approved", "Looks safe")).toEqual({
      id: "suggestion-1",
      status: "approved",
      reviewedBy: "dashboard",
      reviewNote: "Looks safe",
    });
  });

  it("trims review notes and omits blank notes", () => {
    expect(buildReviewPayload(pendingSuggestion.id, "rejected", "  Not related  ")).toMatchObject({
      reviewNote: "Not related",
    });
    expect(buildReviewPayload(pendingSuggestion.id, "rejected", "   ")).not.toHaveProperty(
      "reviewNote",
    );
  });

  it("exposes persisted action and generator provenance for review", () => {
    expect(getSuggestionAction(pendingSuggestion)).toEqual({
      command: "unforgit web",
      description: "Open graph view to create links",
    });
    expect(getSuggestionProvenance(pendingSuggestion)).toEqual({
      createdBy: "dashboard",
      sourceSuggestionId: "add-links-batch",
    });
  });

  it("uses the embedding stats API contract without rendering NaN", () => {
    expect(
      embeddingCoveragePercent({
        total: 1,
        withEmbeddings: 0,
        withoutEmbeddings: 1,
        coverage: 0,
      }),
    ).toBe(0);
    expect(embeddingCoveragePercent(null)).toBe(0);
  });

  it("removes reviewed pending suggestions from the dashboard list", () => {
    const remaining = removeReviewedSuggestion(
      [pendingSuggestion, { ...pendingSuggestion, id: "suggestion-2" }],
      "suggestion-1",
    );

    expect(remaining).toEqual([{ ...pendingSuggestion, id: "suggestion-2" }]);
  });
});
