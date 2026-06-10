import { describe, expect, it } from "vitest";
import { safeLogError, safeLogIdentifier } from "../remote.js";

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

  it("returns a safe placeholder for empty identifiers", () => {
    expect(safeLogIdentifier("\n\r\t")).toBe("???");
  });
});

describe("safeLogError", () => {
  it("returns a bounded error name without attacker-controlled message", () => {
    expect(safeLogError(new Error("boom\nforged"))).toBe("Error");
  });

  it("returns a stable type for non-error values", () => {
    expect(safeLogError("boom\nforged")).toBe("string");
  });
});
