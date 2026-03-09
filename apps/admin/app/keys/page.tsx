"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, Loader2, Key, ShieldCheck, ShieldOff } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { AuthGuard } from "@/components/auth-guard";
import { KeyTable } from "@/components/key-table";
import { CreateKeyDialog } from "@/components/create-key-dialog";
import { apiFetch } from "@/lib/api";

interface ApiKeyData {
  id: string;
  key: string;
  name: string;
  orgId: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const data = await apiFetch<{ keys: ApiKeyData[] }>("/api/keys");
      setKeys(data.keys);
    } catch {
      // handled by apiFetch (redirects on 401)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const activeCount = keys.filter((k) => k.isActive).length;
  const inactiveCount = keys.filter((k) => !k.isActive).length;

  return (
    <AuthGuard>
      <AdminHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[24px] font-bold tracking-tight">API Keys</h1>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Manage API keys for your Unforgit server
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setLoading(true); fetchKeys(); }}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-border/50 bg-white/[0.04] px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setDialogOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-dracula-purple px-4 py-2 text-[13px] font-medium text-dracula-background transition-all hover:bg-dracula-purple/90"
                >
                  <Plus className="h-4 w-4" />
                  Create Key
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/50 bg-dracula-current/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[22px] font-bold">{keys.length}</p>
                    <p className="text-[11px] text-muted-foreground">Total Keys</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/50 bg-dracula-current/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-dracula-green/10">
                    <ShieldCheck className="h-4 w-4 text-dracula-green" />
                  </div>
                  <div>
                    <p className="text-[22px] font-bold text-dracula-green">{activeCount}</p>
                    <p className="text-[11px] text-muted-foreground">Active</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/50 bg-dracula-current/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
                    <ShieldOff className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[22px] font-bold">{inactiveCount}</p>
                    <p className="text-[11px] text-muted-foreground">Inactive</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border/50 bg-dracula-current/20 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-dracula-purple" />
                </div>
              ) : (
                <KeyTable keys={keys} onRefresh={fetchKeys} />
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateKeyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={fetchKeys}
      />
    </AuthGuard>
  );
}
