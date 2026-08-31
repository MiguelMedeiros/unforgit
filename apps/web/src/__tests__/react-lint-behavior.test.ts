import { describe, expect, it } from "vitest";
import { createMemoryDetailState } from "../../lib/memory-detail-state";
import {
  getTimeframeDays,
  getTimeframeLabel,
} from "../../lib/timeframe";

describe("memory detail selection state", () => {
  it("does not retain detail state after the selection closes", () => {
    expect(createMemoryDetailState(null)).toBeNull();
  });

  it("starts each selected memory with fresh loading state", () => {
    expect(createMemoryDetailState("memory-2")).toEqual({
      key: "memory-2",
      loading: true,
      memory: null,
      linkedMemories: [],
    });
  });
});

describe("dashboard timeframe helpers", () => {
  it("maps each bounded timeframe to its day count", () => {
    expect(getTimeframeDays("1d")).toBe(1);
    expect(getTimeframeDays("1w")).toBe(7);
    expect(getTimeframeDays("1m")).toBe(30);
    expect(getTimeframeDays("3m")).toBe(90);
    expect(getTimeframeDays("6m")).toBe(180);
    expect(getTimeframeDays("1y")).toBe(365);
  });

  it("keeps all-time unbounded and labels unknown values safely", () => {
    expect(getTimeframeDays("all")).toBeNull();
    expect(getTimeframeLabel("all")).toBe("All");
  });
});
