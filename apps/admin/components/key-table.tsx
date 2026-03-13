"use client";

import { useState } from "react";
import { Trash2, Loader2, Key, User } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

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

interface KeyTableProps {
  keys: ApiKeyData[];
  onRefresh: () => void;
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

function KeyRow({ apiKey, onRefresh }: { apiKey: ApiKeyData; onRefresh: () => void }) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await apiFetch(`/api/keys/${apiKey.id}`, { method: "PATCH" });
      onRefresh();
      toast.success(`Key ${apiKey.isActive ? "deactivated" : "activated"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle key");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/keys/${apiKey.id}`, { method: "DELETE" });
      onRefresh();
      toast.success("API key deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete key");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <tr className="border-b border-border/20 last:border-0 transition-colors hover:bg-white/[0.02]">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[13px] font-medium">{apiKey.name}</p>
            <code className="text-[11px] font-mono text-muted-foreground">{apiKey.key}</code>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="group flex items-center gap-2"
        >
          <div
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              apiKey.isActive ? "bg-foreground/60" : "bg-white/10"
            } ${toggling ? "opacity-50" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${
                apiKey.isActive ? "translate-x-4 bg-background" : "translate-x-0.5 bg-white"
              }`}
            />
          </div>
          <span
            className={`text-[12px] font-medium ${
              apiKey.isActive ? "text-foreground" : "text-muted-foreground"
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
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-destructive/15 px-2.5 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/25"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Confirm"
              )}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.1]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

export function KeyTable({ keys, onRefresh }: KeyTableProps) {
  if (keys.length === 0) {
    return (
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
    );
  }

  return (
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
          {keys.map((k) => (
            <KeyRow key={k.id} apiKey={k} onRefresh={onRefresh} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
