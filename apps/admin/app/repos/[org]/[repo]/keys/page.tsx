"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  RefreshCw,
  Loader2,
  Key,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch } from "@/lib/api";
import { KeyTable } from "@/components/key-table";
import { CreateKeyDialog } from "@/components/create-key-dialog";

interface ApiKeyData {
  id: string;
  key: string;
  name: string;
  label?: string | null;
  orgId: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function RepoKeysPage({
  params,
}: {
  params: Promise<{ org: string; repo: string }>;
}) {
  const { org, repo } = use(params);

  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ keys: ApiKeyData[] }>(
        `/api/repo/${org}/${repo}/keys`
      );
      setKeys(data.keys);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load API keys"
      );
    } finally {
      setLoading(false);
    }
  }, [org, repo]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const activeCount = keys.filter((k) => k.isActive).length;
  const inactiveCount = keys.filter((k) => !k.isActive).length;

  return (
    <AuthGuard>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 py-6 sm:py-10">
          <div className="animate-fade-in space-y-4 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:gap-6">
              <Link
                href={`/repos/${org}/${repo}`}
                className="flex items-center gap-2 text-[12px] sm:text-[13px] text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Repository
              </Link>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight">
                      API Keys
                    </h1>
                    <a
                      href={`https://github.com/${org}/${repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground/30 hover:text-foreground/70 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                    </a>
                  </div>
                  <p className="text-[12px] sm:text-[13px] text-muted-foreground">
                    <span className="font-mono break-all">{org}/{repo}</span> · Manage API keys
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchKeys}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl border border-border/50 bg-white/4 px-3 sm:px-3.5 py-2 text-[12px] sm:text-[13px] font-medium text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    onClick={() => setDialogOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-white/10 px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-medium text-foreground transition-all hover:bg-white/15"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Create Key</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10">
                    <Key className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{keys.length}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">
                      Total Keys
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10">
                    <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{activeCount}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">Active</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10">
                    <ShieldOff className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{inactiveCount}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">
                      Inactive
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Keys Table */}
            <div className="rounded-2xl border border-border/30 bg-dracula-current overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-foreground" />
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
        repo={`${org}/${repo}`}
      />
    </AuthGuard>
  );
}
