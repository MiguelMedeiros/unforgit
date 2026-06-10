import { describe, expect, it } from "vitest";
import { computeGraphHealth } from "../../lib/graph-health";

describe("computeGraphHealth", () => {
  it("counts active orphan memories and valid relationship types", () => {
    const health = computeGraphHealth(
      [
        { id: "a", status: "active", isConsolidation: true },
        { id: "b", status: "active" },
        { id: "c", status: "active" },
        { id: "d", status: "superseded" },
      ],
      [
        { sourceId: "a", targetId: "b", linkType: "related_to" },
        { sourceId: "a", targetId: "d", linkType: "derived_from" },
        { sourceId: "missing", targetId: "a", linkType: "related_to" },
      ],
    );

    expect(health).toMatchObject({
      activeMemories: 3,
      activeConsolidations: 1,
      supersededMemories: 1,
      totalLinks: 3,
      validLinks: 2,
      orphanActiveMemories: 1,
      orphanRatio: 0.33,
      derivedFromLinks: 1,
      relatedLinks: 1,
    });
  });
});
