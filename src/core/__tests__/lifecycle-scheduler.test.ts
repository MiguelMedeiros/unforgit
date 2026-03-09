import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LifecycleScheduler } from "../lifecycle-scheduler.js";

describe("LifecycleScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("debounces repeated schedule calls for the same repo", async () => {
    const runner = vi.fn().mockResolvedValue(undefined);
    const scheduler = new LifecycleScheduler(runner, { debounceMs: 100 });

    scheduler.schedule("org", "repo");
    scheduler.schedule("org", "repo");
    scheduler.schedule("org", "repo");

    await vi.advanceTimersByTimeAsync(99);
    expect(runner).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(runner).toHaveBeenCalledTimes(1);
    expect(runner).toHaveBeenCalledWith("org", "repo");

    scheduler.dispose();
  });

  it("re-schedules after a new trigger arrives while a run is active", async () => {
    let resolveRun: (() => void) | undefined;
    const runner = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRun = resolve;
        }),
    );
    const scheduler = new LifecycleScheduler(runner, { debounceMs: 100 });

    scheduler.schedule("org", "repo");
    await vi.advanceTimersByTimeAsync(100);
    expect(runner).toHaveBeenCalledTimes(1);

    scheduler.schedule("org", "repo");
    expect(runner).toHaveBeenCalledTimes(1);

    resolveRun?.();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(99);
    expect(runner).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(runner).toHaveBeenCalledTimes(2);

    scheduler.dispose();
  });
});
