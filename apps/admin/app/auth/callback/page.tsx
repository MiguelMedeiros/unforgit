"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { setToken, setUser, getApiBaseUrl } from "@/lib/api";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    if (!token) {
      setError("No token received from authentication");
      return;
    }

    setToken(token);

    const fetchUser = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user info");
        }

        const user = await response.json();

        setUser({
          id: user.id,
          githubId: user.githubId,
          githubLogin: user.githubLogin,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          isAdmin: user.isAdmin,
        });

        router.replace("/repos");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    fetchUser();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h2 className="text-lg font-semibold text-destructive">
                Authentication Failed
              </h2>
            </div>
            <p className="text-sm text-destructive/80 mb-4">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/15"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/50" />
        <p className="text-sm text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/50" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
