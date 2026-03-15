"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Mail,
  Calendar,
  FolderGit2,
  Key,
  Trash2,
  Shield,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch, clearToken, getApiBaseUrl, getToken } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RepoAccess {
  orgId: string;
  repoId: string;
  permission: string;
}

interface UserProfile {
  id: string;
  githubId: number;
  githubLogin: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  repos: RepoAccess[];
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        router.push("/");
        return;
      }

      const res = await fetch(`${getApiBaseUrl()}/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          clearToken();
          router.push("/");
          return;
        }
        throw new Error("Failed to load profile");
      }

      const data = await res.json();
      setProfile(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await apiFetch("/api/settings/delete", {
        method: "DELETE",
      });
      
      toast.success("Account deleted successfully");
      clearToken();
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete account");
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/50" />
        </div>
      </AuthGuard>
    );
  }

  if (!profile) {
    return (
      <AuthGuard>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <User className="h-12 w-12 text-foreground/20" />
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-10">
          <h1 className="text-lg sm:text-xl font-semibold mb-6 sm:mb-8">Settings</h1>

          {/* Profile Card */}
          <Card className="mb-6">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">Profile</CardTitle>
              <CardDescription className="text-[12px] sm:text-sm">Your account information from GitHub</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              {/* Avatar and Name */}
              <div className="flex items-center gap-3 sm:gap-4">
                {profile.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.githubLogin}
                    width={64}
                    height={64}
                    className="rounded-full h-12 w-12 sm:h-16 sm:w-16"
                  />
                ) : (
                  <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-foreground/10">
                    <User className="h-6 w-6 sm:h-8 sm:w-8 text-foreground/50" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-semibold">{profile.githubLogin}</span>
                    {profile.isAdmin && (
                      <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                        <Shield className="h-3 w-3" />
                        ADMIN
                      </span>
                    )}
                  </div>
                  {profile.name && (
                    <p className="text-[12px] sm:text-sm text-muted-foreground">{profile.name}</p>
                  )}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {profile.email && (
                <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-white/[0.02] px-3 sm:px-4 py-2.5 sm:py-3">
                  <Mail className="h-4 w-4 text-foreground/50 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Email</p>
                    <p className="text-[12px] sm:text-sm truncate">{profile.email}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-white/[0.02] px-3 sm:px-4 py-2.5 sm:py-3">
                <Calendar className="h-4 w-4 text-foreground/50 shrink-0" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Member since</p>
                  <p className="text-[12px] sm:text-sm">{formatDate(profile.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-white/[0.02] px-3 sm:px-4 py-2.5 sm:py-3">
                <FolderGit2 className="h-4 w-4 text-foreground/50 shrink-0" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Repositories</p>
                  <p className="text-[12px] sm:text-sm">{profile.repos.length} repositories</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-white/[0.02] px-3 sm:px-4 py-2.5 sm:py-3">
                <Key className="h-4 w-4 text-foreground/50 shrink-0" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">GitHub ID</p>
                  <p className="text-[12px] sm:text-sm font-mono">{profile.githubId}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Danger Zone */}
          <Card className="border-red-500/30">
            <CardHeader className="px-4 sm:px-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <CardTitle className="text-red-400 text-base sm:text-lg">Danger Zone</CardTitle>
              </div>
              <CardDescription className="text-[12px] sm:text-sm">
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 sm:p-4">
                <div>
                  <p className="font-medium text-[14px] sm:text-base">Delete Account</p>
                  <p className="text-[12px] sm:text-sm text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-[13px] sm:text-sm w-full sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove all associated data including:
                      <ul className="mt-3 list-disc pl-4 space-y-1">
                        <li>All your API keys</li>
                        <li>Your repository access permissions</li>
                        <li>Your profile information</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="bg-red-500 text-white hover:bg-red-600"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
