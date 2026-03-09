"use client";

import { useState } from "react";
import { Copy, Check, Loader2, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface CreatedKey {
  id: string;
  key: string;
  name: string;
  orgId: string;
}

interface CreateKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function parseRepoInput(input: string): { orgId: string; name: string } | null {
  let cleaned = input.trim();

  // Handle full GitHub URLs: https://github.com/org/repo(.git)
  const urlMatch = cleaned.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/.]+)/,
  );
  if (urlMatch) {
    return { orgId: urlMatch[1], name: `${urlMatch[1]}/${urlMatch[2]}` };
  }

  // Handle SSH: git@github.com:org/repo.git
  const sshMatch = cleaned.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) {
    return { orgId: sshMatch[1], name: `${sshMatch[1]}/${sshMatch[2]}` };
  }

  // Handle org/repo format
  cleaned = cleaned.replace(/\.git$/, "");
  const parts = cleaned.split("/");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { orgId: parts[0], name: `${parts[0]}/${parts[1]}` };
  }

  return null;
}

export function CreateKeyDialog({ open, onClose, onCreated }: CreateKeyDialogProps) {
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const parsed = repo ? parseRepoInput(repo) : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!parsed) {
      setError("Invalid repository format. Use owner/repo or a GitHub URL.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch<CreatedKey>("/api/keys", {
        method: "POST",
        body: JSON.stringify({ name: parsed.name, orgId: parsed.orgId }),
      });
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
    setRepo("");
    setError("");
    setCreatedKey(null);
    setCopied(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md animate-scale-in rounded-2xl border border-border/50 bg-[rgba(30,31,41,0.98)] p-6 shadow-2xl">
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
            <div className="rounded-xl bg-dracula-orange/10 border border-dracula-orange/20 p-3">
              <p className="text-[12px] text-dracula-orange font-medium">
                Copy this key now. It will not be shown again.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] text-muted-foreground">
                API Key
              </label>
              <div className="flex gap-2">
                <code className="flex-1 rounded-lg bg-white/[0.04] border border-border/50 px-3 py-2 text-[13px] font-mono text-dracula-green break-all">
                  {createdKey.key}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-white/[0.04] transition-colors hover:bg-white/[0.08]"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-dracula-green" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] text-muted-foreground">Repository</label>
              <p className="text-[13px] text-dracula-cyan">{createdKey.name}</p>
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
              <input
                id="key-repo"
                type="text"
                value={repo}
                onChange={(e) => { setRepo(e.target.value); setError(""); }}
                placeholder="https://github.com/org/repo or org/repo"
                autoFocus
                required
                className="w-full rounded-xl border border-border/50 bg-white/[0.04] px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:border-dracula-purple/50 focus:outline-none focus:ring-1 focus:ring-dracula-purple/30 transition-colors"
              />
              {parsed && (
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  Key for <span className="text-dracula-cyan font-medium">{parsed.name}</span>
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-dracula-red/10 border border-dracula-red/20 px-3 py-2">
                <p className="text-[13px] text-dracula-red">{error}</p>
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
                disabled={loading || !repo}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-dracula-purple px-4 py-2.5 text-[13px] font-medium text-dracula-background transition-all hover:bg-dracula-purple/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
