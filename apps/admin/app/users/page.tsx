"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  Shield,
  ShieldOff,
  Trash2,
  FolderGit2,
  Loader2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch, getUser } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    if (currentUser && !currentUser.isAdmin) {
      setIsAdmin(false);
    } else {
      setIsAdmin(true);
    }
  }, []);

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
    if (isAdmin === true) {
      fetchUsers();
    }
  }, [isAdmin]);

  if (isAdmin === false) {
    return (
      <AuthGuard>
        <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
          <AlertTriangle className="h-12 w-12 text-amber-400" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-center text-muted-foreground max-w-md">
            You need admin privileges to view the users page.
          </p>
          <button
            onClick={() => router.push("/repos")}
            className="mt-4 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/15"
          >
            Back to Repositories
          </button>
        </div>
      </AuthGuard>
    );
  }

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

  const adminCount = users.filter((u) => u.isAdmin).length;

  return (
    <AuthGuard>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 py-6 sm:py-10">
          <div className="animate-fade-in space-y-4 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div>
                <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight">Users</h1>
                <p className="text-[12px] sm:text-[13px] text-muted-foreground">
                  {users.length} users · {adminCount} admins
                </p>
              </div>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-white/[0.04] px-3 sm:px-3.5 py-2 text-[12px] sm:text-[13px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{users.length}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{adminCount}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">Admins</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{users.length - adminCount}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">Regular Users</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Users Table */}
            {loading && users.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-border/30 bg-dracula-current">
                <Loader2 className="h-6 w-6 animate-spin text-foreground/50" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-border/30 bg-dracula-current">
                <Users className="h-12 w-12 text-foreground/20" />
                <p className="text-[13px] text-muted-foreground">No users yet</p>
                <p className="text-[12px] text-muted-foreground/70">
                  Users will appear here after they sign in with GitHub
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block rounded-xl border border-border/30 bg-dracula-current overflow-hidden">
                  <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="w-[300px]">User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
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
                            <div className="flex flex-col">
                              <a
                                href={`https://github.com/${user.githubLogin}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 font-medium hover:underline"
                              >
                                {user.githubLogin}
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </a>
                              {user.name && (
                                <span className="text-xs text-muted-foreground">
                                  {user.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email || "—"}
                        </TableCell>
                        <TableCell>
                          {user.isAdmin ? (
                            <span className="inline-flex items-center rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                              Admin
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">User</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/users/${user.id}`}
                              className="flex items-center justify-center rounded-lg p-2 text-foreground/50 transition-colors hover:bg-white/10 hover:text-foreground"
                              title="View repos & keys"
                            >
                              <FolderGit2 className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => toggleAdmin(user.id, user.isAdmin)}
                              className="flex items-center justify-center rounded-lg p-2 text-foreground/50 transition-colors hover:bg-white/10 hover:text-foreground"
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
                              className="flex items-center justify-center rounded-lg p-2 text-foreground/50 transition-colors hover:bg-destructive/20 hover:text-destructive"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border/30 rounded-xl border border-border/30 bg-dracula-current overflow-hidden">
                {users.map((user) => (
                  <div key={user.id} className="p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
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
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://github.com/${user.githubLogin}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-medium text-[13px] hover:underline truncate"
                            >
                              {user.githubLogin}
                              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                            </a>
                            {user.isAdmin && (
                              <span className="inline-flex items-center rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 shrink-0">
                                Admin
                              </span>
                            )}
                          </div>
                          {user.name && (
                            <span className="text-[11px] text-muted-foreground truncate block">
                              {user.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      {user.email && <span>{user.email}</span>}
                      <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/users/${user.id}`}
                        className="flex items-center gap-1.5 rounded-lg bg-white/6 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                      >
                        <FolderGit2 className="h-3.5 w-3.5" />
                        Repos
                      </Link>
                      <button
                        onClick={() => toggleAdmin(user.id, user.isAdmin)}
                        className="flex items-center gap-1.5 rounded-lg bg-white/6 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                      >
                        {user.isAdmin ? (
                          <>
                            <ShieldOff className="h-3.5 w-3.5" />
                            Revoke Admin
                          </>
                        ) : (
                          <>
                            <Shield className="h-3.5 w-3.5" />
                            Make Admin
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-white/6 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
