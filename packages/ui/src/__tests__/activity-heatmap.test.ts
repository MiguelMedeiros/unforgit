import { describe, expect, it } from "vitest";
import { formatActivitySummary } from "../components/activity-heatmap";

describe("formatActivitySummary", () => {
  it("labels activity counts as all memory records across every status", () => {
    expect(formatActivitySummary(68, 15)).toBe(
      "68 memory records across all statuses in 15 active days",
    );
  });

  it("handles singular memory and active day labels", () => {
    expect(formatActivitySummary(1, 1)).toBe(
      "1 memory record across all statuses in 1 active day",
    );
  });
});
