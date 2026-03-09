import { describe, expect, it } from "vitest";
import {
  applyLifecycleDefaults,
  computeUsageBoost,
  resolveLifecycleConfig,
} from "../lifecycle.js";

describe("lifecycle", () => {
  it("applies default episodic TTL", () => {
    const memory = applyLifecycleDefaults({
      orgId: "org",
      repoId: "repo",
      memoryType: "episodic",
      text: "Observed flaky integration behavior",
    });

    expect(memory.ttlSeconds).toBe(30 * 24 * 60 * 60);
  });

  it("does not force TTL on semantic memories", () => {
    const memory = applyLifecycleDefaults({
      orgId: "org",
      repoId: "repo",
      memoryType: "semantic",
      text: "We prefer UTC timestamps everywhere",
    });

    expect(memory.ttlSeconds).toBeUndefined();
  });

  it("respects configured TTL overrides", () => {
    const memory = applyLifecycleDefaults(
      {
        orgId: "org",
        repoId: "repo",
        memoryType: "episodic",
        text: "Temporary observation",
      },
      {
        ttlSecondsByType: {
          episodic: 3600,
        },
      },
    );

    expect(memory.ttlSeconds).toBe(3600);
  });

  it("returns a bounded usage boost only after reuse threshold", () => {
    const lifecycle = resolveLifecycleConfig();

    expect(computeUsageBoost(1, new Date(), lifecycle)).toBe(0);

    const boost = computeUsageBoost(
      8,
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      lifecycle,
    );

    expect(boost).toBeGreaterThan(0);
    expect(boost).toBeLessThanOrEqual(lifecycle.usageBoost.maxBoost);
  });
});
