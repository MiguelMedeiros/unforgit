"use client";

import { useState } from "react";
import { Copy, Check, Loader2, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface CreatedKey {
  id: string;
  key: string;
  name: string;
  label?: string | null;
  orgId: string;
}

interface RepoOption {
  orgId: string;
  repoId: string;
}

interface CreateKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  repo?: string;
  userId?: string;
  userRepos?: RepoOption[];
}

export function CreateKeyDialog({ open, onClose, onCreated, repo, userId, userRepos }: CreateKeyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [label, setLabel] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");

  const parsed = repo ? (() => {
    const parts = repo.split("/");
    if (parts.length === 2) {
      return { orgId: parts[0], name: repo, repoId: parts[1] };
    }
    return null;
  })() : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const keyLabel = label.trim() || undefined;
      let data: CreatedKey;

      if (userId && selectedRepo) {
        const [orgId, repoId] = selectedRepo.split("/");
        data = await apiFetch<CreatedKey>(`/api/users/${userId}/api-keys`, {
          method: "POST",
          body: JSON.stringify({ name: selectedRepo, orgId, repoId, label: keyLabel }),
        });
      } else if (parsed) {
        data = await apiFetch<CreatedKey>("/api/keys", {
          method: "POST",
          body: JSON.stringify({ name: parsed.name, orgId: parsed.orgId, label: keyLabel }),
        });
      } else {
        throw new Error("No repository selected");
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

  const handleClose = () => {
    setCreatedKey(null);
    setCopied(false);
    setLabel("");
    setSelectedRepo("");
    onClose();
  };

  const canCreate = userId ? !!selectedRepo : !!parsed;

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
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
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
                <code className="flex-1 rounded-lg bg-white/4 border border-border/50 px-3 py-2 text-[13px] font-mono text-foreground break-all">
                  {createdKey.key}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-white/4 transition-colors hover:bg-white/8"
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

            {createdKey.label && (
              <div>
                <label className="mb-1 block text-[12px] text-muted-foreground">Label</label>
                <p className="text-[13px] text-foreground">{createdKey.label}</p>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full rounded-xl bg-white/6 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/10"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                Repository
              </label>
              {userId && userRepos ? (
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-white/4 px-3 py-2.5 text-[14px] text-foreground focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"
                >
                  <option value="">Select a repository...</option>
                  {userRepos.map((r) => (
                    <option key={`${r.orgId}/${r.repoId}`} value={`${r.orgId}/${r.repoId}`}>
                      {r.orgId}/{r.repoId}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[14px] text-foreground">{repo}</p>
              )}
            </div>

            <div>
              <label htmlFor="key-label" className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                Label (optional)
              </label>
              <input
                id="key-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Shared with João for project X"
                autoFocus={!userId}
                className="w-full rounded-xl border border-border/50 bg-white/4 px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"
              />
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                Add a description to remember who you shared this key with
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl bg-white/6 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !canCreate}
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
