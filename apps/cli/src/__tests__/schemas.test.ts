import { describe, it, expect } from "vitest";
import {
  appConfigSchema,
  validateMemoryType,
  parseConfidence,
  parseThreshold,
  parseTtl,
  parsePositiveInt,
} from "unforgit-config";

describe("appConfigSchema", () => {
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
    const result = appConfigSchema.safeParse(validConfig);
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
    const result = appConfigSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it("rejects missing remote", () => {
    const result = appConfigSchema.safeParse({ defaults: validConfig.defaults });
    expect(result.success).toBe(false);
  });

  it("rejects invalid visibility enum", () => {
    const bad = {
      ...validConfig,
      defaults: { ...validConfig.defaults, visibility: "invalid" },
    };
    const result = appConfigSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid memoryType enum", () => {
    const bad = {
      ...validConfig,
      defaults: { ...validConfig.defaults, memoryType: "invalid" },
    };
    const result = appConfigSchema.safeParse(bad);
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
    const result = appConfigSchema.safeParse(bad);
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
  it("accepts valid confidence values", () => {
    expect(parseConfidence("0")).toBe(0);
    expect(parseConfidence("0.5")).toBe(0.5);
    expect(parseConfidence("1")).toBe(1);
  });

  it("rejects NaN", () => {
    expect(() => parseConfidence("abc")).toThrow();
    expect(() => parseConfidence("0.5abc")).toThrow();
    expect(() => parseConfidence("")).toThrow();
  });

  it("rejects out of range", () => {
    expect(() => parseConfidence("1.5")).toThrow();
    expect(() => parseConfidence("-0.1")).toThrow();
  });
});

describe("parseThreshold", () => {
  it("accepts valid threshold values", () => {
    expect(parseThreshold("0")).toBe(0);
    expect(parseThreshold("0.5")).toBe(0.5);
    expect(parseThreshold("1")).toBe(1);
  });

  it("rejects malformed values", () => {
    expect(() => parseThreshold("abc")).toThrow();
    expect(() => parseThreshold("0.5abc")).toThrow();
    expect(() => parseThreshold("")).toThrow();
  });

  it("rejects out of range", () => {
    expect(() => parseThreshold("1.5")).toThrow();
    expect(() => parseThreshold("-0.1")).toThrow();
  });
});

describe("parseTtl", () => {
  it("accepts positive integers", () => {
    expect(parseTtl("60")).toBe(60);
    expect(parseTtl("3600")).toBe(3600);
  });

  it("rejects non-positive", () => {
    expect(() => parseTtl("0")).toThrow();
    expect(() => parseTtl("-1")).toThrow();
  });

  it("rejects NaN", () => {
    expect(() => parseTtl("abc")).toThrow();
    expect(() => parseTtl("60s")).toThrow();
    expect(() => parseTtl("1.5")).toThrow();
  });
});

describe("parsePositiveInt", () => {
  it("accepts positive integers", () => {
    expect(parsePositiveInt("10", "limit")).toBe(10);
  });

  it("rejects zero", () => {
    expect(() => parsePositiveInt("0", "limit")).toThrow();
  });

  it("rejects NaN", () => {
    expect(() => parsePositiveInt("foo", "limit")).toThrow();
    expect(() => parsePositiveInt("10px", "limit")).toThrow();
    expect(() => parsePositiveInt("1.5", "limit")).toThrow();
  });
});
