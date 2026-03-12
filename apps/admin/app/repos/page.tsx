"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FolderGit2,
  Users,
  Brain,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch } from "@/lib/api";

interface Repo {
  orgId: string;
  repoId: string;
  userCount: number;
  memoryCount: number;
}

export default function ReposPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ repos: Repo[] }>("/api/repos");
      setRepos(data.repos);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load repos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const totalMemories = repos.reduce((sum, r) => sum + r.memoryCount, 0);
  const totalUsers = new Set(repos.flatMap((r) => r.userCount)).size;

  return (
    <AuthGuard>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <FolderGit2 className="h-5 w-5 text-foreground/70" />
            <h1 className="text-lg font-semibold">Repositories</h1>
            <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs text-foreground/70">
              {repos.length}
            </span>
          </div>
          <button
            onClick={fetchRepos}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 border-b border-border/30 px-6 py-4">
          <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FolderGit2 className="h-4 w-4" />
              <span className="text-xs">Total Repos</span>
            </div>
            <p className="text-2xl font-semibold">{repos.length}</p>
          </div>
          <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Brain className="h-4 w-4" />
              <span className="text-xs">Total Memories</span>
            </div>
            <p className="text-2xl font-semibold">{totalMemories.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Active Users</span>
            </div>
            <p className="text-2xl font-semibold">{totalUsers}</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading && repos.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-foreground/50" />
            </div>
          ) : repos.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <FolderGit2 className="h-12 w-12 text-foreground/20" />
              <p className="text-sm text-muted-foreground">No repositories yet</p>
              <p className="text-xs text-muted-foreground/70">
                Repositories will appear here after users sync their memories
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {repos
                .sort((a, b) => b.memoryCount - a.memoryCount)
                .map((repo) => (
                  <div
                    key={`${repo.orgId}/${repo.repoId}`}
                    className="group flex items-center justify-between rounded-xl border border-border/30 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-4">
                      <FolderGit2 className="h-5 w-5 text-foreground/50" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">
                            {repo.orgId}/{repo.repoId}
                          </span>
                          <a
                            href={`https://github.com/${repo.orgId}/${repo.repoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground/30 hover:text-foreground/70 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Brain className="h-4 w-4" />
                        <span>{repo.memoryCount.toLocaleString()} memories</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{repo.userCount} users</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
