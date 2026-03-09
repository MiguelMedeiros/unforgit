export interface LifecycleSchedulerOptions {
  debounceMs: number;
  onError?: (error: unknown, context: { orgId: string; repoId: string }) => void;
}

type LifecycleRunner = (orgId: string, repoId: string) => Promise<void>;

interface SchedulerState {
  timer?: ReturnType<typeof setTimeout>;
  running: boolean;
  pending: boolean;
  orgId: string;
  repoId: string;
}

export class LifecycleScheduler {
  private states = new Map<string, SchedulerState>();

  constructor(
    private readonly runner: LifecycleRunner,
    private readonly options: LifecycleSchedulerOptions,
  ) {}

  schedule(orgId: string, repoId: string): void {
    const key = `${orgId}:${repoId}`;
    const state = this.states.get(key) ?? {
      running: false,
      pending: false,
      orgId,
      repoId,
    };

    state.orgId = orgId;
    state.repoId = repoId;

    if (state.running) {
      state.pending = true;
      this.states.set(key, state);
      return;
    }

    if (state.timer) {
      clearTimeout(state.timer);
    }

    state.timer = setTimeout(() => {
      void this.run(key);
    }, this.options.debounceMs);

    this.states.set(key, state);
  }

  dispose(): void {
    for (const state of this.states.values()) {
      if (state.timer) {
        clearTimeout(state.timer);
      }
    }

    this.states.clear();
  }

  private async run(key: string): Promise<void> {
    const state = this.states.get(key);
    if (!state) {
      return;
    }

    state.timer = undefined;
    state.running = true;
    this.states.set(key, state);

    try {
      await this.runner(state.orgId, state.repoId);
    } catch (error) {
      this.options.onError?.(error, {
        orgId: state.orgId,
        repoId: state.repoId,
      });
    } finally {
      state.running = false;

      if (state.pending) {
        state.pending = false;
        this.states.set(key, state);
        this.schedule(state.orgId, state.repoId);
      } else {
        this.states.delete(key);
      }
    }
  }
}
