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
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch } from "@/lib/api";
import { CreateKeyDialog } from "@/components/create-key-dialog";

interface Repo {
  orgId: string;
  repoId: string;
  userCount: number;
  memoryCount: number;
}

export default function ReposPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllRepos, setShowAllRepos] = useState(false);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [selectedRepoForKey, setSelectedRepoForKey] = useState<string>("");

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

  const reposWithMemories = repos.filter((r) => r.memoryCount > 0);
  const reposWithoutMemories = repos.filter((r) => r.memoryCount === 0);
  const displayedRepos = showAllRepos ? repos : reposWithMemories;

  const totalMemories = repos.reduce((sum, r) => sum + r.memoryCount, 0);
  const totalUsers = new Set(repos.flatMap((r) => r.userCount)).size;

  const handleGenerateKey = (repo: Repo) => {
    setSelectedRepoForKey(`${repo.orgId}/${repo.repoId}`);
    setKeyDialogOpen(true);
  };

  const handleKeyDialogClose = () => {
    setKeyDialogOpen(false);
    setSelectedRepoForKey("");
  };

  return (
    <AuthGuard>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <FolderGit2 className="h-5 w-5 text-foreground/70" />
            <h1 className="text-lg font-semibold">Repositories</h1>
            <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs text-foreground/70">
              {reposWithMemories.length}
            </span>
            {reposWithoutMemories.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({reposWithoutMemories.length} without memories)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {reposWithoutMemories.length > 0 && (
              <button
                onClick={() => setShowAllRepos(!showAllRepos)}
                className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground"
              >
                {showAllRepos ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide empty
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show all
                  </>
                )}
              </button>
            )}
            <button
              onClick={fetchRepos}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 border-b border-border/30 px-6 py-4">
          <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FolderGit2 className="h-4 w-4" />
              <span className="text-xs">Repos with Memories</span>
            </div>
            <p className="text-2xl font-semibold">{reposWithMemories.length}</p>
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
          ) : displayedRepos.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <FolderGit2 className="h-12 w-12 text-foreground/20" />
              <p className="text-sm text-muted-foreground">
                {reposWithMemories.length === 0
                  ? "No repositories with memories yet"
                  : "No repositories to display"}
              </p>
              <p className="text-xs text-muted-foreground/70">
                Repositories will appear here after users sync their memories
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedRepos
                .sort((a, b) => b.memoryCount - a.memoryCount)
                .map((repo) => (
                  <div
                    key={`${repo.orgId}/${repo.repoId}`}
                    className={`group flex items-center justify-between rounded-xl border border-border/30 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04] ${
                      repo.memoryCount === 0 ? "opacity-50" : ""
                    }`}
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
                      <button
                        onClick={() => handleGenerateKey(repo)}
                        className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground"
                      >
                        <Key className="h-3.5 w-3.5" />
                        Generate Key
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <CreateKeyDialog
        open={keyDialogOpen}
        onClose={handleKeyDialogClose}
        onCreated={() => {}}
        initialRepo={selectedRepoForKey}
      />
    </AuthGuard>
  );
}
