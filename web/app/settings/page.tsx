"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  HardDrive,
  FolderOpen,
  RefreshCw,
  Cloud,
  Loader2,
} from "lucide-react";
import { useSyncContext } from "@/components/sync-provider";

interface ConfigData {
  initialized: boolean;
  workspace: string;
  config: {
    remote: { url: string; orgId: string; repoId: string };
    defaults: { visibility: string; memoryType: string };
  } | null;
  dbPath: string;
  dbSize: number | null;
  remoteConnected: boolean;
  hasRemoteUrl: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <div className="text-[13px]">{children}</div>
    </div>
  );
}

function SettingsGroup({ title, icon: Icon, description, children }: {
  title: string;
  icon: React.ElementType;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-white/[0.05] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/20">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06]">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold">{title}</h3>
          {description && (
            <p className="text-[11px] text-muted-foreground/60">{description}</p>
          )}
        </div>
      </div>
      <div className="divide-y divide-border/20 px-5">
        {children}
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function SyncSettings() {
  const { settings, status, isSyncing, lastSyncResult, syncNow, updateSettings, refreshStatus } = useSyncContext();

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return (
    <SettingsGroup
      title="Sync"
      icon={Cloud}
      description="Automatic synchronization with remote server"
    >
      <SettingsRow label="Auto Sync">
        <button
          onClick={() => updateSettings({ autoSyncEnabled: !settings.autoSyncEnabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.autoSyncEnabled ? "bg-dracula-purple" : "bg-white/10"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.autoSyncEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </SettingsRow>
      <SettingsRow label="Sync Interval">
        <select
          value={settings.syncIntervalMinutes}
          onChange={(e) => updateSettings({ syncIntervalMinutes: Number(e.target.value) })}
          disabled={!settings.autoSyncEnabled}
          className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[13px] text-foreground border border-border/30 disabled:opacity-50"
        >
          <option value={1}>Every 1 minute</option>
          <option value={5}>Every 5 minutes</option>
          <option value={15}>Every 15 minutes</option>
          <option value={30}>Every 30 minutes</option>
          <option value={60}>Every hour</option>
        </select>
      </SettingsRow>
      <SettingsRow label="Pending Sync">
        {status ? (
          <Badge className={`border-0 ${
            status.pendingSync > 0 
              ? "bg-dracula-orange/15 text-dracula-orange" 
              : "bg-dracula-green/15 text-dracula-green"
          }`}>
            {status.pendingSync} {status.pendingSync === 1 ? "memory" : "memories"}
          </Badge>
        ) : (
          <span className="text-muted-foreground">Loading...</span>
        )}
      </SettingsRow>
      <SettingsRow label="Remote Status">
        {status?.remoteConfigured ? (
          status.remoteConnected ? (
            <Badge className="bg-dracula-green/15 text-dracula-green border-0">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge className="bg-dracula-red/15 text-dracula-red border-0">
              <XCircle className="mr-1 h-3 w-3" />
              Disconnected
            </Badge>
          )
        ) : (
          <Badge className="bg-white/10 text-muted-foreground border-0">
            Not configured
          </Badge>
        )}
      </SettingsRow>
      <SettingsRow label="Last Sync">
        <span className="text-muted-foreground">
          {formatRelativeTime(settings.lastSyncAt)}
        </span>
      </SettingsRow>
      {lastSyncResult && (
        <SettingsRow label="Last Result">
          <span className="text-muted-foreground">
            {lastSyncResult.synced} synced, {lastSyncResult.failed} failed
          </span>
        </SettingsRow>
      )}
      <div className="py-4">
        <button
          onClick={() => syncNow()}
          disabled={isSyncing || !status?.remoteConnected || status?.pendingSync === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-dracula-purple px-4 py-2.5 text-[13px] font-medium text-dracula-background transition-all hover:bg-dracula-purple/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Sync Now
            </>
          )}
        </button>
      </div>
    </SettingsGroup>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-dracula-purple border-t-transparent" />
          <span className="text-[13px] text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-[13px] text-muted-foreground">
          Failed to load configuration
        </span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-10">
        <div className="animate-fade-in space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">Settings</h1>
            <p className="text-[13px] text-muted-foreground">
              Configuration and connection status
            </p>
          </div>

          {/* Local Store */}
          <SettingsGroup
            title="Local Store"
            icon={HardDrive}
            description="SQLite database on your machine"
          >
            <SettingsRow label="Status">
              {config.initialized ? (
                <Badge className="bg-dracula-green/15 text-dracula-green border-0">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Initialized
                </Badge>
              ) : (
                <Badge className="bg-dracula-red/15 text-dracula-red border-0">
                  <XCircle className="mr-1 h-3 w-3" />
                  Not initialized
                </Badge>
              )}
            </SettingsRow>
            <SettingsRow label="Database Path">
              <code className="max-w-[240px] truncate text-[11px] text-muted-foreground font-mono block text-right">
                {config.dbPath}
              </code>
            </SettingsRow>
            <SettingsRow label="Database Size">
              <span className="text-muted-foreground">
                {config.dbSize !== null ? formatBytes(config.dbSize) : "N/A"}
              </span>
            </SettingsRow>
          </SettingsGroup>

          {/* Sync */}
          <SyncSettings />

          {/* Configuration */}
          {config.config && (
            <SettingsGroup
              title="Configuration"
              icon={FolderOpen}
              description=".hippocampus/hippo.yaml"
            >
              <SettingsRow label="Workspace">
                <code className="max-w-[240px] truncate text-[11px] text-muted-foreground font-mono block text-right">
                  {config.workspace}
                </code>
              </SettingsRow>
              <SettingsRow label="Organization">
                <span className="text-muted-foreground">
                  {config.config.remote.orgId || "Not set"}
                </span>
              </SettingsRow>
              <SettingsRow label="Repository">
                <span className="text-muted-foreground">
                  {config.config.remote.repoId || "Not set"}
                </span>
              </SettingsRow>
              <SettingsRow label="Default Visibility">
                <span className="text-muted-foreground">
                  {config.config.defaults.visibility}
                </span>
              </SettingsRow>
              <SettingsRow label="Default Memory Type">
                <span className="text-muted-foreground">
                  {config.config.defaults.memoryType}
                </span>
              </SettingsRow>
            </SettingsGroup>
          )}
        </div>
      </div>
    </div>
  );
}
