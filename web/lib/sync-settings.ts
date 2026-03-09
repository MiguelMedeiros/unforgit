const SYNC_SETTINGS_KEY = "unforgit-sync-settings";

export interface SyncSettings {
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncAt: string | null;
}

const DEFAULT_SETTINGS: SyncSettings = {
  autoSyncEnabled: true,
  syncIntervalMinutes: 5,
  lastSyncAt: null,
};

export function getSyncSettings(): SyncSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SYNC_SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSyncSettings(settings: Partial<SyncSettings>): SyncSettings {
  const current = getSyncSettings();
  const updated = { ...current, ...settings };

  if (typeof window !== "undefined") {
    localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(updated));
  }

  return updated;
}

export function updateLastSyncTime(): void {
  saveSyncSettings({ lastSyncAt: new Date().toISOString() });
}
