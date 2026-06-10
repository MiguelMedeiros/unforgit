import { describe, expect, it } from "vitest";
import { safeLogIdentifier } from "../remote.js";

describe("safeLogIdentifier", () => {
  it("replaces control characters that can forge log lines", () => {
    expect(safeLogIdentifier("abc\nerror: forged\rline\tend")).toBe(
      "abc?error: forged?line?end",
    );
  });

  it("caps long identifiers to keep logs bounded", () => {
    const result = safeLogIdentifier("a".repeat(80));

    expect(result).toHaveLength(67);
    expect(result.endsWith("...")).toBe(true);
  });
});
