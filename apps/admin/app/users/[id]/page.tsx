"use client";

import { useEffect, useState, use, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  Key,
  FolderGit2,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  Brain,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch } from "@/lib/api";

interface RepoAccess {
  orgId: string;
  repoId: string;
  permission: string;
  grantedAt: string;
  memoryCount?: number;
}

interface RepoWithMemories {
  orgId: string;
  repoId: string;
  userCount: number;
  memoryCount: number;
}

interface ApiKey {
  id: string;
  key: string;
  name: string;
  orgId: string;
  repoId: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

interface UserDetail {
  id: string;
  githubId: number;
  githubLogin: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  repos: RepoAccess[];
  apiKeys: ApiKey[];
}

interface NewKeyData {
  name: string;
  orgId: string;
  repoId: string;
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState<NewKeyData>({
    name: "",
    orgId: "",
    repoId: "",
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAllRepos, setShowAllRepos] = useState(false);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const [userData, reposData] = await Promise.all([
        apiFetch<UserDetail>(`/api/users/${id}`),
        apiFetch<{ repos: RepoWithMemories[] }>("/api/repos"),
      ]);

      const memoryMap = new Map<string, number>();
      for (const repo of reposData.repos) {
        memoryMap.set(`${repo.orgId}/${repo.repoId}`, repo.memoryCount);
      }

      const enrichedRepos = userData.repos.map((repo) => ({
        ...repo,
        memoryCount: memoryMap.get(`${repo.orgId}/${repo.repoId}`) ?? 0,
      }));

      setUser({ ...userData, repos: enrichedRepos });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const createApiKey = async () => {
    if (!newKeyData.name || !newKeyData.orgId) {
      toast.error("Name and organization are required");
      return;
    }

    try {
      const data = await apiFetch<{ key: string }>(`/api/users/${id}/api-keys`, {
        method: "POST",
        body: JSON.stringify({
          name: newKeyData.name,
          orgId: newKeyData.orgId,
          repoId: newKeyData.repoId || undefined,
        }),
      });
      setCreatedKey(data.key);
      fetchUser();
      toast.success("API key created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create API key");
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) {
      return;
    }

    try {
      await apiFetch(`/api/keys/${keyId}`, {
        method: "DELETE",
      });
      fetchUser();
      toast.success("API key deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete API key");
    }
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeDialog = () => {
    setShowNewKeyDialog(false);
    setNewKeyData({ name: "", orgId: "", repoId: "" });
    setCreatedKey(null);
    setCopied(false);
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/50" />
        </div>
      </AuthGuard>
    );
  }

  if (!user) {
    return (
      <AuthGuard>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <Users className="h-12 w-12 text-foreground/20" />
          <p className="text-muted-foreground">User not found</p>
          <Link
            href="/users"
            className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border/30 px-6 py-4">
          <Link
            href="/users"
            className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.githubLogin}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10">
                <Users className="h-4 w-4 text-foreground/50" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold">{user.githubLogin}</h1>
                {user.isAdmin && (
                  <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    <Shield className="h-3 w-3" />
                    ADMIN
                  </span>
                )}
              </div>
              {user.name && (
                <p className="text-xs text-muted-foreground">{user.name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Repos */}
          <section>
            {(() => {
              const reposWithMemories = user.repos.filter((r) => (r.memoryCount ?? 0) > 0);
              const reposWithoutMemories = user.repos.filter((r) => (r.memoryCount ?? 0) === 0);
              const displayedRepos = showAllRepos ? user.repos : reposWithMemories;

              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="h-4 w-4 text-foreground/70" />
                      <h2 className="text-sm font-medium">Repositories with Memories</h2>
                      <span className="text-xs text-muted-foreground">
                        ({reposWithMemories.length})
                      </span>
                      {reposWithoutMemories.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({reposWithoutMemories.length} without memories)
                        </span>
                      )}
                    </div>
                    {reposWithoutMemories.length > 0 && (
                      <button
                        onClick={() => setShowAllRepos(!showAllRepos)}
                        className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground"
                      >
                        {showAllRepos ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Hide empty
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Show all
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {displayedRepos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {reposWithMemories.length === 0
                        ? "No repositories with memories yet"
                        : "No repositories to display"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {displayedRepos
                        .sort((a, b) => (b.memoryCount ?? 0) - (a.memoryCount ?? 0))
                        .map((repo) => (
                          <div
                            key={`${repo.orgId}/${repo.repoId}`}
                            className={`flex items-center justify-between rounded-lg border border-border/30 bg-white/[0.02] px-4 py-3 ${
                              (repo.memoryCount ?? 0) === 0 ? "opacity-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <FolderGit2 className="h-4 w-4 text-foreground/50" />
                              <span className="font-mono text-sm">
                                {repo.orgId}/{repo.repoId}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Brain className="h-3.5 w-3.5" />
                                <span>{(repo.memoryCount ?? 0).toLocaleString()}</span>
                              </div>
                              <span className="rounded bg-foreground/10 px-2 py-0.5 text-xs">
                                {repo.permission}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              );
            })()}
          </section>

          {/* API Keys */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-foreground/70" />
                <h2 className="text-sm font-medium">API Keys</h2>
                <span className="text-xs text-muted-foreground">
                  ({user.apiKeys.length})
                </span>
              </div>
              <button
                onClick={() => setShowNewKeyDialog(true)}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/15"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Key
              </button>
            </div>
            {user.apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No API keys yet
              </p>
            ) : (
              <div className="space-y-2">
                {user.apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-white/[0.02] px-4 py-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{key.name}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            key.isActive
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {key.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{key.key}</span>
                        <span>
                          {key.orgId}
                          {key.repoId && `/${key.repoId}`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      className="flex items-center justify-center rounded-lg p-2 text-foreground/50 transition-colors hover:bg-destructive/20 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Create Key Dialog */}
      {showNewKeyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/30 bg-background p-6">
            <h3 className="text-lg font-semibold mb-4">
              {createdKey ? "API Key Created" : "Create API Key"}
            </h3>

            {createdKey ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                  <p className="text-sm text-amber-400 mb-2">
                    Copy this key now. You won't be able to see it again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-black/20 px-3 py-2 font-mono text-sm break-all">
                      {createdKey}
                    </code>
                    <button
                      onClick={copyKey}
                      className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/15"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={closeDialog}
                  className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/15"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newKeyData.name}
                    onChange={(e) =>
                      setNewKeyData({ ...newKeyData, name: e.target.value })
                    }
                    placeholder="e.g., my-local-dev"
                    className="w-full rounded-lg border border-border/50 bg-white/[0.04] px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    Organization / Owner
                  </label>
                  <input
                    type="text"
                    value={newKeyData.orgId}
                    onChange={(e) =>
                      setNewKeyData({ ...newKeyData, orgId: e.target.value })
                    }
                    placeholder="e.g., my-org"
                    className="w-full rounded-lg border border-border/50 bg-white/[0.04] px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    Repository (optional)
                  </label>
                  <input
                    type="text"
                    value={newKeyData.repoId}
                    onChange={(e) =>
                      setNewKeyData({ ...newKeyData, repoId: e.target.value })
                    }
                    placeholder="e.g., my-repo"
                    className="w-full rounded-lg border border-border/50 bg-white/[0.04] px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Leave empty for org-wide access
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={closeDialog}
                    className="flex-1 rounded-lg border border-border/30 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createApiKey}
                    disabled={!newKeyData.name || !newKeyData.orgId}
                    className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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
