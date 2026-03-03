"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, LayoutDashboard, Database, History, GitFork, Settings, Cloud, Loader2, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSyncContext } from "./sync-provider";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/memories", label: "Memories", icon: Database },
  { href: "/history", label: "History", icon: History },
  { href: "/graph", label: "Graph", icon: GitFork },
  { href: "/settings", label: "Settings", icon: Settings },
];

function RepoIndicator() {
  const [repo, setRepo] = useState<{ orgId: string; repoId: string } | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.config?.remote?.orgId && data.config?.remote?.repoId) {
          setRepo({
            orgId: data.config.remote.orgId,
            repoId: data.config.remote.repoId,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!repo) return null;

  return (
    <a
      href={`https://github.com/${repo.orgId}/${repo.repoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
    >
      <Github className="h-3.5 w-3.5" />
      <span>{repo.orgId}/{repo.repoId}</span>
    </a>
  );
}

function SyncIndicator() {
  const { status, isSyncing, settings } = useSyncContext();

  if (!status?.remoteConfigured) return null;

  const pendingCount = status.pendingSync;
  const isConnected = status.remoteConnected;
  const autoSyncOn = settings.autoSyncEnabled;

  return (
    <Link
      href="/settings"
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer hover:opacity-80",
        isSyncing
          ? "bg-dracula-cyan/10 text-dracula-cyan"
          : pendingCount > 0
            ? "bg-dracula-orange/10 text-dracula-orange"
            : isConnected
              ? "bg-dracula-green/10 text-dracula-green"
              : "bg-white/5 text-muted-foreground"
      )}
      title={
        isSyncing
          ? "Syncing..."
          : pendingCount > 0
            ? `${pendingCount} memories pending sync`
            : isConnected
              ? "All synced"
              : "Remote disconnected"
      }
    >
      {isSyncing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Cloud className="h-3.5 w-3.5" />
      )}
      <span>
        {isSyncing
          ? "Syncing"
          : pendingCount > 0
            ? `${pendingCount} pending`
            : isConnected
              ? "Synced"
              : "Offline"}
      </span>
      {autoSyncOn && !isSyncing && (
        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-current opacity-60" title="Auto-sync enabled" />
      )}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 bg-[rgba(18,18,18,0.8)] px-6 glass-subtle">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-b from-dracula-purple/90 to-dracula-purple shadow-[0_2px_8px_rgba(189,147,249,0.3)]">
            <Brain className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Hippocampus
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
                  active
                    ? "bg-white/10 text-white"
                    : "text-[#98989d] hover:bg-white/[0.05] hover:text-[#d1d1d6]"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-dracula-purple" : ""
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <RepoIndicator />
        <SyncIndicator />
        <p className="text-[11px] text-muted-foreground/60">v0.1.0</p>
      </div>
    </header>
  );
}
