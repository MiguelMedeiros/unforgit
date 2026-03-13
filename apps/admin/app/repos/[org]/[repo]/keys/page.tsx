"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FolderGit2,
  ExternalLink,
  Plus,
  RefreshCw,
  Loader2,
  Key,
  ShieldCheck,
  ShieldOff,
  Trash2,
  User,
  Copy,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface ApiKeyUser {
  id: string;
  githubLogin: string;
  name: string | null;
}

interface ApiKeyData {
  id: string;
  key: string;
  name: string;
  orgId: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  user: ApiKeyUser | null;
}

interface CreatedKey {
  id: string;
  key: string;
  name: string;
  orgId: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
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
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = await apiFetch<CreatedKey>(`/api/repo/${org}/${repo}/keys`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setCreatedKey(data);
      fetchKeys();
      toast.success("API key created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create key"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async (keyId: string, isActive: boolean) => {
    setTogglingId(keyId);
    try {
      await apiFetch(`/api/keys/${keyId}`, { method: "PATCH" });
      fetchKeys();
      toast.success(`Key ${isActive ? "deactivated" : "activated"}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle key"
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (keyId: string) => {
    setDeletingId(keyId);
    try {
      await apiFetch(`/api/keys/${keyId}`, { method: "DELETE" });
      fetchKeys();
      toast.success("API key deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete key"
      );
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const activeCount = keys.filter((k) => k.isActive).length;
  const inactiveCount = keys.filter((k) => !k.isActive).length;

  return (
    <AuthGuard>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-10">
          <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-6">
              <Link
                href={`/repos/${org}/${repo}`}
                className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Repository
              </Link>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Key className="h-6 w-6 text-foreground/70" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-[28px] font-bold tracking-tight">
                        API Keys
                      </h1>
                      <a
                        href={`https://github.com/${org}/${repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/30 hover:text-foreground/70 transition-colors"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      <span className="font-mono">{org}/{repo}</span> · Manage API keys for this repository
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchKeys}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl border border-border/50 bg-white/[0.04] px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                  <button
                    onClick={() => setDialogOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-[13px] font-medium text-foreground transition-all hover:bg-white/15"
                  >
                    <Plus className="h-4 w-4" />
                    Create Key
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/30 bg-dracula-current p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Key className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[24px] font-bold">{keys.length}</p>
                    <p className="text-[12px] text-muted-foreground">
                      Total Keys
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/30 bg-dracula-current p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <ShieldCheck className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[24px] font-bold">{activeCount}</p>
                    <p className="text-[12px] text-muted-foreground">Active</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/30 bg-dracula-current p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <ShieldOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[24px] font-bold">{inactiveCount}</p>
                    <p className="text-[12px] text-muted-foreground">
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
              ) : keys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                    <Key className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="mt-4 text-[14px] font-medium text-muted-foreground">
                    No API keys yet
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground/60">
                    Create your first key to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Key
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Created
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Last Used
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((apiKey) => (
                        <tr
                          key={apiKey.id}
                          className="border-b border-border/20 last:border-0 transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-[13px] font-medium">
                                  {apiKey.name}
                                </p>
                                <code className="text-[11px] font-mono text-muted-foreground">
                                  {apiKey.key}
                                </code>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() =>
                                handleToggle(apiKey.id, apiKey.isActive)
                              }
                              disabled={togglingId === apiKey.id}
                              className="group flex items-center gap-2"
                            >
                              <div
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  apiKey.isActive
                                    ? "bg-foreground/60"
                                    : "bg-white/10"
                                } ${togglingId === apiKey.id ? "opacity-50" : "cursor-pointer"}`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${
                                    apiKey.isActive
                                      ? "translate-x-4 bg-background"
                                      : "translate-x-0.5 bg-white"
                                  }`}
                                />
                              </div>
                              <span
                                className={`text-[12px] font-medium ${
                                  apiKey.isActive
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {apiKey.isActive ? "Active" : "Inactive"}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            {apiKey.user ? (
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08]">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <span className="text-[12px] text-foreground">
                                  {apiKey.user.githubLogin}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[12px] text-muted-foreground/50 italic">
                                No user
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[12px] text-muted-foreground">
                              {formatDate(apiKey.createdAt)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[12px] text-muted-foreground">
                              {formatRelativeTime(apiKey.lastUsedAt)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {confirmDeleteId === apiKey.id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDelete(apiKey.id)}
                                  disabled={deletingId === apiKey.id}
                                  className="rounded-lg bg-destructive/15 px-2.5 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/25"
                                >
                                  {deletingId === apiKey.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Confirm"
                                  )}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.1]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(apiKey.id)}
                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setDialogOpen(false);
              setCreatedKey(null);
              setCopied(false);
            }}
          />
          <div className="relative w-full max-w-md animate-scale-in rounded-2xl border border-border/30 bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[16px] font-semibold">
                {createdKey ? "Key Created" : "Create API Key"}
              </h2>
              <button
                onClick={() => {
                  setDialogOpen(false);
                  setCreatedKey(null);
                  setCopied(false);
                }}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createdKey ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-foreground/10 border border-foreground/20 p-3">
                  <p className="text-[12px] text-foreground font-medium">
                    Copy this key now. It will not be shown again.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] text-muted-foreground">
                    API Key
                  </label>
                  <div className="flex gap-2">
                    <code className="flex-1 rounded-lg bg-white/[0.04] border border-border/50 px-3 py-2 text-[13px] font-mono text-foreground break-all">
                      {createdKey.key}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-white/[0.04] transition-colors hover:bg-white/[0.08]"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-foreground" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] text-muted-foreground">
                    Repository
                  </label>
                  <p className="text-[13px] text-foreground">
                    {org}/{repo}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setDialogOpen(false);
                    setCreatedKey(null);
                    setCopied(false);
                  }}
                  className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/[0.1]"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[13px] text-muted-foreground">
                  Create a new API key for{" "}
                  <span className="text-foreground font-medium">
                    {org}/{repo}
                  </span>
                </p>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setDialogOpen(false)}
                    className="flex-1 rounded-xl bg-white/[0.06] px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/[0.1]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-[13px] font-medium text-foreground transition-all hover:bg-white/15 disabled:opacity-50"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
