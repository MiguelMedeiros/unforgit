"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FolderGit2,
  Brain,
  Loader2,
  RefreshCw,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch } from "@/lib/api";
import { CreateKeyDialog } from "@/components/create-key-dialog";

interface Repo {
  orgId: string;
  repoId: string;
  keyCount: number;
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
  const totalKeys = repos.reduce((sum, r) => sum + r.keyCount, 0);

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
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 py-6 sm:py-10">
          <div className="animate-fade-in space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight">Repositories</h1>
                <p className="text-[12px] sm:text-[13px] text-muted-foreground">
                  {reposWithMemories.length} with memories
                  {reposWithoutMemories.length > 0 && ` · ${reposWithoutMemories.length} without memories`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {reposWithoutMemories.length > 0 && (
                  <button
                    onClick={() => setShowAllRepos(!showAllRepos)}
                    className="flex items-center gap-2 rounded-xl border border-border/50 bg-white/[0.04] px-3 sm:px-3.5 py-2 text-[12px] sm:text-[13px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                  >
                    {showAllRepos ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Show all</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Show all</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={fetchRepos}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-border/50 bg-white/[0.04] px-3 sm:px-3.5 py-2 text-[12px] sm:text-[13px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10">
                    <FolderGit2 className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{reposWithMemories.length}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">Repos with Memories</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10">
                    <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{totalMemories.toLocaleString()}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">Total Memories</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10">
                    <Key className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{totalKeys}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">Active Keys</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Repos List */}
            {loading && repos.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-border/30 bg-dracula-current">
                <Loader2 className="h-6 w-6 animate-spin text-foreground/50" />
              </div>
            ) : displayedRepos.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-border/30 bg-dracula-current">
                <FolderGit2 className="h-12 w-12 text-foreground/20" />
                <p className="text-[13px] text-muted-foreground">
                  {reposWithMemories.length === 0
                    ? "No repositories with memories yet"
                    : "No repositories to display"}
                </p>
                <p className="text-[12px] text-muted-foreground/70">
                  Repositories will appear here after users sync their memories
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30 rounded-xl border border-border/30 bg-dracula-current overflow-hidden">
                {displayedRepos
                  .sort((a, b) => b.memoryCount - a.memoryCount)
                  .map((repo) => (
                    <Link
                      key={`${repo.orgId}/${repo.repoId}`}
                      href={`/repos/${repo.orgId}/${repo.repoId}`}
                      className={`group block p-3 sm:p-4 transition-colors hover:bg-white/[0.02] ${
                        repo.memoryCount === 0 ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <FolderGit2 className="h-5 w-5 text-foreground/50 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[13px] sm:text-[14px] font-medium group-hover:text-foreground transition-colors truncate">
                                {repo.orgId}/{repo.repoId}
                              </span>
                              <span
                                role="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.open(`https://github.com/${repo.orgId}/${repo.repoId}`, "_blank");
                                }}
                                className="text-foreground/30 hover:text-foreground/70 transition-colors shrink-0"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </span>
                            </div>
                            {/* Mobile stats */}
                            <div className="flex items-center gap-4 mt-1.5 sm:hidden">
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Brain className="h-3.5 w-3.5" />
                                <span>{repo.memoryCount.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Key className="h-3.5 w-3.5" />
                                <span>{repo.keyCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                          {/* Desktop stats */}
                          <div className="hidden sm:flex items-center gap-2 text-[13px] text-muted-foreground">
                            <Brain className="h-4 w-4" />
                            <span>{repo.memoryCount.toLocaleString()} memories</span>
                          </div>
                          <div className="hidden sm:flex items-center gap-2 text-[13px] text-muted-foreground">
                            <Key className="h-4 w-4" />
                            <span>{repo.keyCount} keys</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleGenerateKey(repo);
                            }}
                            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[12px] text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground"
                          >
                            <Key className="h-3.5 w-3.5" />
                            Generate Key
                          </button>
                          <ChevronRight className="h-5 w-5 text-foreground/30 group-hover:text-foreground/70 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateKeyDialog
        open={keyDialogOpen}
        onClose={handleKeyDialogClose}
        onCreated={() => {}}
        repo={selectedRepoForKey}
      />
    </AuthGuard>
  );
}
