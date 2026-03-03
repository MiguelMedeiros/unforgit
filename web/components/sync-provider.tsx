"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  getSyncSettings,
  saveSyncSettings,
  updateLastSyncTime,
  SyncSettings,
} from "@/lib/sync-settings";

interface SyncStatus {
  pendingSync: number;
  remoteConfigured: boolean;
  remoteConnected: boolean;
}

interface SyncResult {
  synced: number;
  failed: number;
  total: number;
}

interface SyncContextValue {
  settings: SyncSettings;
  status: SyncStatus | null;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  syncNow: () => Promise<SyncResult | null>;
  updateSettings: (settings: Partial<SyncSettings>) => void;
  refreshStatus: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncContext() {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSyncContext must be used within SyncProvider");
  }
  return ctx;
}

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const [settings, setSettings] = useState<SyncSettings>(getSyncSettings);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    if (isSyncing) return null;

    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const result: SyncResult = await res.json();
        setLastSyncResult(result);
        updateLastSyncTime();
        setSettings(getSyncSettings());
        await refreshStatus();
        return result;
      }
      return null;
    } catch {
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshStatus]);

  const updateSettingsHandler = useCallback(
    (newSettings: Partial<SyncSettings>) => {
      const updated = saveSyncSettings(newSettings);
      setSettings(updated);
    },
    []
  );

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (settings.autoSyncEnabled && settings.syncIntervalMinutes > 0) {
      const intervalMs = settings.syncIntervalMinutes * 60 * 1000;

      intervalRef.current = setInterval(async () => {
        const currentStatus = await fetch("/api/sync")
          .then((r) => r.json())
          .catch(() => null);

        if (currentStatus?.pendingSync > 0 && currentStatus?.remoteConnected) {
          await syncNow();
        }
      }, intervalMs);

      if (status?.pendingSync && status.pendingSync > 0 && status.remoteConnected) {
        const timerId = setTimeout(() => {
          syncNow();
        }, 5000);
        return () => {
          clearTimeout(timerId);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        };
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settings.autoSyncEnabled, settings.syncIntervalMinutes, syncNow, status?.pendingSync, status?.remoteConnected]);

  return (
    <SyncContext.Provider
      value={{
        settings,
        status,
        isSyncing,
        lastSyncResult,
        syncNow,
        updateSettings: updateSettingsHandler,
        refreshStatus,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
