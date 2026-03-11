"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cloud, CloudUpload, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSyncContext } from "./sync-provider";

const navItems = [
  { href: "/", label: "dashboard" },
  { href: "/memories", label: "memories" },
  { href: "/consolidation", label: "consolidate" },
  { href: "/history", label: "history" },
  { href: "/graph", label: "graph" },
  { href: "/settings", label: "settings" },
];

function SyncIndicator() {
  const { status, isSyncing, settings, hasConflicts, conflictCount } = useSyncContext();

  if (!status?.remoteConfigured) return null;

  const pendingCount = status.pendingSync;
  const pendingDeletions = status.pendingDeletions ?? 0;
  const isConnected = status.remoteConnected;
  const autoSyncOn = settings.autoSyncEnabled;

  const getTooltip = () => {
    const parts: string[] = [];
    if (isSyncing) return "Syncing...";
    if (hasConflicts) parts.push(`${conflictCount} conflict${conflictCount > 1 ? "s" : ""}`);
    if (pendingCount > 0) parts.push(`${pendingCount} memories pending`);
    if (pendingDeletions > 0) parts.push(`${pendingDeletions} deletions pending`);
    if (autoSyncOn) parts.push("Auto-sync on");
    if (parts.length === 0) return isConnected ? "All synced" : "Remote disconnected";
    return parts.join(" · ");
  };

  return (
    <Link
      href="/settings"
      className="relative h-4 w-4 text-foreground/50 transition-colors hover:text-foreground"
      title={getTooltip()}
    >
      <Cloud
        className={cn(
          "absolute inset-0 h-4 w-4 transition-all duration-300",
          isSyncing ? "opacity-0 scale-75" : "opacity-100 scale-100"
        )}
      />
      <CloudUpload
        className={cn(
          "absolute inset-0 h-4 w-4 transition-all duration-300",
          isSyncing ? "opacity-100 scale-100 animate-pulse" : "opacity-0 scale-75"
        )}
      />
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="flex items-center justify-between border-b border-border/50 bg-[rgba(18,18,18,0.8)] px-6 py-4 glass-subtle">
        <Link href="/" className="text-foreground hover:text-foreground transition-colors">
          <span className="text-lg font-bold tracking-tight">
            <span className="underline decoration-2 underline-offset-[3px]">un</span>forgit
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7">
          <nav className="flex items-center gap-7">
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
                    "relative text-sm transition-colors",
                    active
                      ? "text-foreground"
                      : "text-foreground/50 hover:text-foreground"
                  )}
                >
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-1 left-0 right-0 h-px bg-foreground/70 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
          <SyncIndicator />
        </div>

        {/* Mobile: sync + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <SyncIndicator />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-foreground/70 hover:text-foreground transition-colors p-1"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border/50 bg-[rgba(18,18,18,0.95)] backdrop-blur-xl px-6 py-4 space-y-1">
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
                  "block rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "text-foreground bg-white/10"
                    : "text-foreground/50 hover:text-foreground hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
