import { describe, expect, it } from "vitest";
import {
  buildReviewPayload,
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

  it("removes reviewed pending suggestions from the dashboard list", () => {
    const remaining = removeReviewedSuggestion(
      [pendingSuggestion, { ...pendingSuggestion, id: "suggestion-2" }],
      "suggestion-1",
    );

    expect(remaining).toEqual([{ ...pendingSuggestion, id: "suggestion-2" }]);
  });
});
