import { EventEmitter } from "events";
import type { LocalStore } from "../db/local.js";
import type { SyncResult, SyncStatus } from "./types.js";

export interface SyncConfig {
  enabled: boolean;
  intervalMs: number;
  debounceMs: number;
  autoResolveConflicts: "last_write_wins" | "local_wins" | "remote_wins" | "manual";
}

export interface SyncServiceOptions {
  store: LocalStore;
  orgId: string;
  repoId: string;
  config?: Partial<SyncConfig>;
  onSync?: (result: SyncServiceResult) => void;
  onError?: (error: Error) => void;
}

export interface SyncServiceResult {
  timestamp: Date;
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

export interface SyncServiceStatus {
  isRunning: boolean;
  lastSyncAt: Date | null;
  lastResult: SyncServiceResult | null;
  pendingChanges: number;
  conflicts: number;
  nextSyncAt: Date | null;
}

const DEFAULT_CONFIG: SyncConfig = {
  enabled: true,
  intervalMs: 60000,
  debounceMs: 5000,
  autoResolveConflicts: "last_write_wins",
};

export class SyncService extends EventEmitter {
  private store: LocalStore;
  private orgId: string;
  private repoId: string;
  private config: SyncConfig;

  private syncInterval: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isSyncing = false;

  private lastSyncAt: Date | null = null;
  private lastResult: SyncServiceResult | null = null;
  private nextSyncAt: Date | null = null;

  constructor(options: SyncServiceOptions) {
    super();
    this.store = options.store;
    this.orgId = options.orgId;
    this.repoId = options.repoId;
    this.config = { ...DEFAULT_CONFIG, ...options.config };

    if (options.onSync) {
      this.on("sync", options.onSync);
    }
    if (options.onError) {
      this.on("error", options.onError);
    }
  }

  start(): void {
    if (this.isRunning || !this.config.enabled) {
      return;
    }

    this.isRunning = true;
    this.scheduleNextSync();

    this.emit("started");
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.syncInterval) {
      clearTimeout(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.nextSyncAt = null;
    this.emit("stopped");
  }

  onMemoryChange(): void {
    if (!this.isRunning || !this.config.enabled) {
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.triggerSync();
    }, this.config.debounceMs);
  }

  async triggerSync(): Promise<SyncServiceResult | null> {
    if (this.isSyncing) {
      return null;
    }

    this.isSyncing = true;
    this.emit("sync:start");

    try {
      const result = await this.performSync();

      this.lastSyncAt = new Date();
      this.lastResult = result;

      this.emit("sync", result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit("error", err);
      return null;
    } finally {
      this.isSyncing = false;
      this.emit("sync:end");

      if (this.isRunning) {
        this.scheduleNextSync();
      }
    }
  }

  getStatus(): SyncServiceStatus {
    const summary = this.store.getSyncSummary(this.orgId, this.repoId);

    return {
      isRunning: this.isRunning,
      lastSyncAt: this.lastSyncAt,
      lastResult: this.lastResult,
      pendingChanges: summary.pendingPush,
      conflicts: summary.conflicts,
      nextSyncAt: this.nextSyncAt,
    };
  }

  private scheduleNextSync(): void {
    if (this.syncInterval) {
      clearTimeout(this.syncInterval);
    }

    this.nextSyncAt = new Date(Date.now() + this.config.intervalMs);

    this.syncInterval = setTimeout(() => {
      this.syncInterval = null;
      this.triggerSync();
    }, this.config.intervalMs);
  }

  private async performSync(): Promise<SyncServiceResult> {
    const errors: string[] = [];
    let pushed = 0;
    let pulled = 0;
    let conflicts = 0;

    const pendingPush = this.store.getPendingPush();
    pushed = pendingPush.length;

    const conflictMemories = this.store.getConflicts();
    conflicts = conflictMemories.length;

    if (this.config.autoResolveConflicts !== "manual" && conflicts > 0) {
      for (const { memory, syncState } of conflictMemories) {
        try {
          this.resolveConflict(memory.id, syncState);
        } catch (err) {
          errors.push(`Conflict resolution failed for ${memory.id}: ${err}`);
        }
      }
    }

    return {
      timestamp: new Date(),
      pushed,
      pulled,
      conflicts,
      errors,
    };
  }

  private resolveConflict(memoryId: string, syncState: { localVersion: number; remoteVersion?: number }): void {
    switch (this.config.autoResolveConflicts) {
      case "local_wins":
        this.store.setSyncState({
          memoryId,
          localVersion: syncState.localVersion,
          remoteVersion: syncState.remoteVersion,
          syncStatus: "pending_push",
        });
        break;

      case "remote_wins":
        this.store.setSyncState({
          memoryId,
          localVersion: syncState.localVersion,
          remoteVersion: syncState.remoteVersion,
          syncStatus: "pending_pull",
        });
        break;

      case "last_write_wins":
      default:
        this.store.setSyncState({
          memoryId,
          localVersion: syncState.localVersion + 1,
          remoteVersion: syncState.remoteVersion,
          syncStatus: "pending_push",
        });
        break;
    }
  }

  updateConfig(config: Partial<SyncConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };

    if (wasRunning && this.config.enabled) {
      this.start();
    }
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }
}

export function createSyncService(options: SyncServiceOptions): SyncService {
  return new SyncService(options);
}
