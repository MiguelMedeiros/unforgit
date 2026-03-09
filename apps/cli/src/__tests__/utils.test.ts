import { describe, it, expect } from "vitest";
import { truncate, maskKey, paginate } from "../utils.js";

describe("truncate", () => {
  it("returns short strings unchanged", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates long strings", () => {
    expect(truncate("this is a very long string", 10)).toBe("this is...");
  });

  it("replaces newlines with spaces", () => {
    expect(truncate("line1\nline2\nline3", 50)).toBe("line1 line2 line3");
  });
});

describe("maskKey", () => {
  it("masks short keys completely", () => {
    expect(maskKey("short")).toBe("***");
  });

  it("shows prefix and suffix for longer keys", () => {
    expect(maskKey("hk_abcdef123456")).toBe("hk_abc...3456");
  });
});

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("returns first page", () => {
    const result = paginate(items, 1, 3);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(4);
    expect(result.total).toBe(10);
  });

  it("returns middle page", () => {
    const result = paginate(items, 2, 3);
    expect(result.items).toEqual([4, 5, 6]);
    expect(result.currentPage).toBe(2);
  });

  it("returns last page with remainder", () => {
    const result = paginate(items, 4, 3);
    expect(result.items).toEqual([10]);
    expect(result.currentPage).toBe(4);
  });

  it("handles page beyond total", () => {
    const result = paginate(items, 100, 5);
    expect(result.currentPage).toBe(2);
    expect(result.items).toEqual([6, 7, 8, 9, 10]);
  });

  it("handles empty array", () => {
    const result = paginate([], 1, 10);
    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(0);
    expect(result.total).toBe(0);
  });

  it("handles single page", () => {
    const result = paginate([1, 2, 3], 1, 10);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.totalPages).toBe(1);
  });
});
