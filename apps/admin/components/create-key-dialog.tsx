"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check, Loader2, Plus, X, Users, GitBranch, Search } from "lucide-react";
import { apiFetch, getApiBaseUrl, getToken } from "@/lib/api";
import { toast } from "sonner";

interface CreatedKey {
  id: string;
  key: string;
  name: string;
  orgId: string;
  userId?: string;
}

interface User {
  id: string;
  githubLogin: string;
  name: string | null;
  avatarUrl: string | null;
}

interface RepoAccess {
  orgId: string;
  repoId: string;
  permission: string;
}

interface CreateKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateKeyDialog({ open, onClose, onCreated }: CreateKeyDialogProps) {
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [repos, setRepos] = useState<RepoAccess[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredRepos = repos.filter((repo) => {
    const fullName = `${repo.orgId}/${repo.repoId}`.toLowerCase();
    const search = repoSearch.toLowerCase();
    return fullName.includes(search);
  });

  const parsed = selectedRepo ? (() => {
    const parts = selectedRepo.split("/");
    if (parts.length === 2) {
      return { orgId: parts[0], name: selectedRepo, repoId: parts[1] };
    }
    return null;
  })() : null;

  useEffect(() => {
    if (open) {
      setLoadingUsers(true);
      setLoadingRepos(true);
      
      apiFetch<{ users: User[] }>("/api/users")
        .then((data) => setUsers(data.users))
        .catch(() => setUsers([]))
        .finally(() => setLoadingUsers(false));

      const token = getToken();
      if (token) {
        fetch(`${getApiBaseUrl()}/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.repos) {
              setRepos(data.repos);
            }
          })
          .catch(() => setRepos([]))
          .finally(() => setLoadingRepos(false));
      } else {
        setLoadingRepos(false);
      }
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!parsed) {
      setError("Please select a repository.");
      return;
    }

    setLoading(true);

    try {
      let data: CreatedKey;
      if (selectedUserId) {
        data = await apiFetch<CreatedKey>(`/api/users/${selectedUserId}/api-keys`, {
          method: "POST",
          body: JSON.stringify({
            name: parsed.name,
            orgId: parsed.orgId,
            repoId: parsed.repoId,
          }),
        });
      } else {
        data = await apiFetch<CreatedKey>("/api/keys", {
          method: "POST",
          body: JSON.stringify({ name: parsed.name, orgId: parsed.orgId }),
        });
      }
      setCreatedKey(data);
      onCreated();
      toast.success("API key created successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectRepo = (repo: RepoAccess) => {
    const fullName = `${repo.orgId}/${repo.repoId}`;
    setSelectedRepo(fullName);
    setRepoSearch(fullName);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setError("");
  };

  const handleRepoInputChange = (value: string) => {
    setRepoSearch(value);
    setSelectedRepo("");
    setShowSuggestions(true);
    setHighlightedIndex(-1);
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredRepos.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => 
        prev < filteredRepos.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectRepo(filteredRepos[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClose = () => {
    setRepoSearch("");
    setSelectedRepo("");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setError("");
    setCreatedKey(null);
    setCopied(false);
    setSelectedUserId("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md animate-scale-in rounded-2xl border border-border/30 bg-dracula-current p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">
            {createdKey ? "Key Created" : "Create API Key"}
          </h2>
          <button
            onClick={handleClose}
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
              <label className="mb-1 block text-[12px] text-muted-foreground">Repository</label>
              <p className="text-[13px] text-foreground">{createdKey.name}</p>
            </div>

            <button
              onClick={handleClose}
              className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/[0.1]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="key-repo" className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                Repository
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  ref={inputRef}
                  id="key-repo"
                  type="text"
                  value={repoSearch}
                  onChange={(e) => handleRepoInputChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  placeholder={loadingRepos ? "Loading repositories..." : "Search repositories..."}
                  autoComplete="off"
                  autoFocus
                  className="w-full rounded-xl border border-border/50 bg-white/[0.04] pl-10 pr-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"
                  disabled={loadingRepos}
                />
                {showSuggestions && !loadingRepos && repoSearch.trim() && filteredRepos.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-border/50 bg-dracula-current shadow-lg"
                  >
                    {filteredRepos.map((repo, index) => {
                      const fullName = `${repo.orgId}/${repo.repoId}`;
                      const isHighlighted = index === highlightedIndex;
                      return (
                        <button
                          key={fullName}
                          type="button"
                          onClick={() => handleSelectRepo(repo)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-[14px] transition-colors ${
                            isHighlighted ? "bg-white/10" : "hover:bg-white/5"
                          } ${index === 0 ? "rounded-t-xl" : ""} ${
                            index === filteredRepos.length - 1 ? "rounded-b-xl" : ""
                          }`}
                        >
                          <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-foreground truncate">{fullName}</span>
                          <span className="ml-auto text-[11px] text-muted-foreground capitalize">
                            {repo.permission}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {showSuggestions && !loadingRepos && repoSearch && filteredRepos.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-border/50 bg-dracula-current shadow-lg p-3">
                    <p className="text-[13px] text-muted-foreground text-center">
                      No repositories match "{repoSearch}"
                    </p>
                  </div>
                )}
              </div>
              {selectedRepo && (
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  Key will be created for <span className="text-foreground font-medium">{selectedRepo}</span>
                </p>
              )}
              {repos.length === 0 && !loadingRepos && !repoSearch && (
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  No repositories found. Make sure you have access to repositories on GitHub.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="key-user" className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                Assign to User (optional)
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <select
                  id="key-user"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border/50 bg-white/[0.04] pl-10 pr-3 py-2.5 text-[14px] text-foreground focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"
                  disabled={loadingUsers}
                >
                  <option value="">No user (legacy key)</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.githubLogin}{user.name ? ` (${user.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                {selectedUserId
                  ? "Key will be linked to this user"
                  : "Leave empty for a standalone key"}
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-[13px] text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl bg-white/[0.06] px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/[0.1]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedRepo}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-[13px] font-medium text-foreground transition-all hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
