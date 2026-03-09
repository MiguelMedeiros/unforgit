import { describe, expect, it } from "vitest";
import { buildAutoLinkQuery } from "../auto-link.js";

describe("auto-link query builder", () => {
  it("builds a whitespace query without raw boolean operators", () => {
    const query = buildAutoLinkQuery(
      "Lifecycle maintenance now follows a brain-like model: soft delete, tombstones, and sync safety.",
      10,
    );

    expect(query).toBeDefined();
    expect(query).not.toContain(" OR ");
    expect(query).toContain("lifecycle");
    expect(query).toContain("tombstones");
  });

  it("returns undefined when text only contains stop words", () => {
    const query = buildAutoLinkQuery("the and or but if with for");
    expect(query).toBeUndefined();
  });
});
