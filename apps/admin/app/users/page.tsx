"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  Shield,
  ShieldOff,
  Trash2,
  FolderGit2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch } from "@/lib/api";

interface User {
  id: string;
  githubId: number;
  githubLogin: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ users: User[] }>("/api/users");
      setUsers(data.users);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      await apiFetch(`/api/users/${userId}/admin`, {
        method: "PATCH",
      });
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, isAdmin: !currentIsAdmin } : u
        )
      );
      toast.success(
        currentIsAdmin ? "Admin privileges revoked" : "Admin privileges granted"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This will also delete all their API keys.")) {
      return;
    }

    try {
      await apiFetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      setUsers(users.filter((u) => u.id !== userId));
      toast.success("User deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    }
  };

  return (
    <AuthGuard>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-foreground/70" />
            <h1 className="text-lg font-semibold">Users</h1>
            <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs text-foreground/70">
              {users.length}
            </span>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading && users.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-foreground/50" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <Users className="h-12 w-12 text-foreground/20" />
              <p className="text-sm text-muted-foreground">No users yet</p>
              <p className="text-xs text-muted-foreground/70">
                Users will appear here after they sign in with GitHub
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="group rounded-xl border border-border/30 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.githubLogin}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10">
                          <Users className="h-5 w-5 text-foreground/50" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.githubLogin}</span>
                          {user.isAdmin && (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
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

                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/users/${user.id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground"
                    >
                      <FolderGit2 className="h-3.5 w-3.5" />
                      Repos & Keys
                    </Link>
                    <button
                      onClick={() => toggleAdmin(user.id, user.isAdmin)}
                      className="flex items-center justify-center rounded-lg bg-white/5 p-2 text-foreground/50 transition-colors hover:bg-white/10 hover:text-foreground"
                      title={user.isAdmin ? "Revoke admin" : "Grant admin"}
                    >
                      {user.isAdmin ? (
                        <ShieldOff className="h-4 w-4" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="flex items-center justify-center rounded-lg bg-white/5 p-2 text-foreground/50 transition-colors hover:bg-destructive/20 hover:text-destructive"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
