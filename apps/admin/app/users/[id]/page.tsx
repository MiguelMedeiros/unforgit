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
  keyCount?: number;
}

interface RepoWithMemories {
  orgId: string;
  repoId: string;
  userCount: number;
  memoryCount: number;
  keyCount: number;
}

interface ApiKey {
  id: string;
  name: string;
  orgId: string;
  repoId: string | null;
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

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllRepos, setShowAllRepos] = useState(false);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const [userData, reposData] = await Promise.all([
        apiFetch<UserDetail>(`/api/users/${id}`),
        apiFetch<{ repos: RepoWithMemories[] }>("/api/repos"),
      ]);

      const repoDataMap = new Map<string, { memoryCount: number; keyCount: number }>();
      for (const repo of reposData.repos) {
        repoDataMap.set(`${repo.orgId}/${repo.repoId}`, {
          memoryCount: repo.memoryCount,
          keyCount: repo.keyCount,
        });
      }

      const keyCountByRepo = new Map<string, number>();
      for (const key of userData.apiKeys) {
        const repoKey = key.repoId ? `${key.orgId}/${key.repoId}` : key.orgId;
        keyCountByRepo.set(repoKey, (keyCountByRepo.get(repoKey) || 0) + 1);
      }

      const enrichedRepos = userData.repos.map((repo) => {
        const fullRepoKey = `${repo.orgId}/${repo.repoId}`;
        const repoInfo = repoDataMap.get(fullRepoKey);
        return {
          ...repo,
          memoryCount: repoInfo?.memoryCount ?? 0,
          keyCount: keyCountByRepo.get(fullRepoKey) || keyCountByRepo.get(repo.orgId) || 0,
        };
      });

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
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 py-6 sm:py-10">
          <div className="animate-fade-in space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/users"
                className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.githubLogin}
                    width={32}
                    height={32}
                    className="rounded-full shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                    <Users className="h-4 w-4 text-foreground/50" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-[20px] sm:text-[28px] font-bold tracking-tight truncate">{user.githubLogin}</h1>
                    {user.isAdmin && (
                      <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 shrink-0">
                        <Shield className="h-3 w-3" />
                        ADMIN
                      </span>
                    )}
                  </div>
                  {user.name && (
                    <p className="text-[12px] sm:text-[13px] text-muted-foreground truncate">{user.name}</p>
                  )}
                </div>
              </div>
            </div>
            {/* Repos */}
            <section>
              {(() => {
                const reposWithMemories = user.repos.filter((r) => (r.memoryCount ?? 0) > 0);
                const reposWithoutMemories = user.repos.filter((r) => (r.memoryCount ?? 0) === 0);
                const displayedRepos = showAllRepos ? user.repos : reposWithMemories;

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <FolderGit2 className="h-4 w-4 text-foreground/70" />
                        <h2 className="text-[13px] sm:text-sm font-medium">Repositories with Memories</h2>
                        <span className="text-[11px] sm:text-xs text-muted-foreground">
                          ({reposWithMemories.length})
                        </span>
                        {reposWithoutMemories.length > 0 && (
                          <span className="text-[11px] sm:text-xs text-muted-foreground">
                            ({reposWithoutMemories.length} without)
                          </span>
                        )}
                      </div>
                      {reposWithoutMemories.length > 0 && (
                        <button
                          onClick={() => setShowAllRepos(!showAllRepos)}
                          className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] sm:text-xs text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground self-start sm:self-auto"
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
                      <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-border/30 bg-dracula-current">
                        <FolderGit2 className="h-8 w-8 text-foreground/20" />
                        <p className="text-[13px] text-muted-foreground">
                          {reposWithMemories.length === 0
                            ? "No repositories with memories yet"
                            : "No repositories to display"}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/30 rounded-xl border border-border/30 bg-dracula-current overflow-hidden">
                        {displayedRepos
                          .sort((a, b) => (b.memoryCount ?? 0) - (a.memoryCount ?? 0))
                          .map((repo) => (
                            <div
                              key={`${repo.orgId}/${repo.repoId}`}
                              className={`p-3 sm:p-4 ${
                                (repo.memoryCount ?? 0) === 0 ? "opacity-50" : ""
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                  <FolderGit2 className="h-4 w-4 text-foreground/50 shrink-0" />
                                  <span className="font-mono text-[13px] sm:text-[14px] truncate">
                                    {repo.orgId}/{repo.repoId}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 ml-6 sm:ml-0">
                                  <div className="flex items-center gap-1.5 text-[12px] sm:text-[13px] text-muted-foreground">
                                    <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    <span>{(repo.memoryCount ?? 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[12px] sm:text-[13px] text-muted-foreground">
                                    <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    <span>{repo.keyCount ?? 0}</span>
                                  </div>
                                  <span className="rounded bg-foreground/10 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs">
                                    {repo.permission}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </section>

          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
