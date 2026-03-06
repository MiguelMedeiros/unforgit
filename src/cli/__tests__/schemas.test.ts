import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hippoConfigSchema,
  validateMemoryType,
  parseConfidence,
  parseTtl,
  parsePositiveInt,
} from "../schemas.js";

describe("hippoConfigSchema", () => {
  const validConfig = {
    remote: {
      url: "http://localhost:3737",
      orgId: "test-org",
      repoId: "test-repo",
    },
    defaults: {
      visibility: "auto",
      memoryType: "episodic",
    },
  };

  it("accepts valid minimal config", () => {
    const result = hippoConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it("accepts config with all optional fields", () => {
    const full = {
      ...validConfig,
      remote: { ...validConfig.remote, apiKey: "hk_test123" },
      sync: {
        enabled: true,
        intervalMs: 60000,
        debounceMs: 5000,
        autoResolveConflicts: "last_write_wins",
      },
      embeddings: {
        enabled: true,
        model: "text-embedding-3-small",
        autoGenerate: true,
      },
    };
    const result = hippoConfigSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it("rejects missing remote", () => {
    const result = hippoConfigSchema.safeParse({ defaults: validConfig.defaults });
    expect(result.success).toBe(false);
  });

  it("rejects invalid visibility enum", () => {
    const bad = {
      ...validConfig,
      defaults: { ...validConfig.defaults, visibility: "invalid" },
    };
    const result = hippoConfigSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid memoryType enum", () => {
    const bad = {
      ...validConfig,
      defaults: { ...validConfig.defaults, memoryType: "invalid" },
    };
    const result = hippoConfigSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects negative sync intervalMs", () => {
    const bad = {
      ...validConfig,
      sync: {
        enabled: true,
        intervalMs: -1,
        debounceMs: 0,
        autoResolveConflicts: "last_write_wins",
      },
    };
    const result = hippoConfigSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

describe("validateMemoryType", () => {
  it("accepts valid types", () => {
    expect(validateMemoryType("episodic")).toBe(true);
    expect(validateMemoryType("semantic")).toBe(true);
    expect(validateMemoryType("procedural")).toBe(true);
  });

  it("rejects invalid types", () => {
    expect(validateMemoryType("invalid")).toBe(false);
    expect(validateMemoryType("")).toBe(false);
    expect(validateMemoryType("EPISODIC")).toBe(false);
  });
});

describe("parseConfidence", () => {
  const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit called");
  });

  beforeEach(() => {
    mockExit.mockClear();
  });

  it("accepts valid confidence values", () => {
    expect(parseConfidence("0")).toBe(0);
    expect(parseConfidence("0.5")).toBe(0.5);
    expect(parseConfidence("1")).toBe(1);
  });

  it("rejects NaN", () => {
    expect(() => parseConfidence("abc")).toThrow("process.exit called");
  });

  it("rejects out of range", () => {
    expect(() => parseConfidence("1.5")).toThrow("process.exit called");
    expect(() => parseConfidence("-0.1")).toThrow("process.exit called");
  });
});

describe("parseTtl", () => {
  const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit called");
  });

  beforeEach(() => {
    mockExit.mockClear();
  });

  it("accepts positive integers", () => {
    expect(parseTtl("60")).toBe(60);
    expect(parseTtl("3600")).toBe(3600);
  });

  it("rejects non-positive", () => {
    expect(() => parseTtl("0")).toThrow("process.exit called");
    expect(() => parseTtl("-1")).toThrow("process.exit called");
  });

  it("rejects NaN", () => {
    expect(() => parseTtl("abc")).toThrow("process.exit called");
  });
});

describe("parsePositiveInt", () => {
  const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit called");
  });

  beforeEach(() => {
    mockExit.mockClear();
  });

  it("accepts positive integers", () => {
    expect(parsePositiveInt("10", "limit")).toBe(10);
  });

  it("rejects zero", () => {
    expect(() => parsePositiveInt("0", "limit")).toThrow("process.exit called");
  });

  it("rejects NaN", () => {
    expect(() => parsePositiveInt("foo", "limit")).toThrow("process.exit called");
  });
});
