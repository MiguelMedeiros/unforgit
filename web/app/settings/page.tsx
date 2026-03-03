"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  HardDrive,
  FolderOpen,
} from "lucide-react";

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
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
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
                <Badge className="bg-apple-green/15 text-apple-green border-0">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Initialized
                </Badge>
              ) : (
                <Badge className="bg-apple-red/15 text-apple-red border-0">
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
