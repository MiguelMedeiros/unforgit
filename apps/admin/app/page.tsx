"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Github, Loader2 } from "lucide-react";
import { getToken, getApiBaseUrl } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/keys");
    }

    const url = new URL(window.location.href);
    if (url.searchParams.get("error")) {
      setLoading(false);
    }
  }, [router]);

  const handleGitHubLogin = () => {
    setLoading(true);
    window.location.href = `${getApiBaseUrl()}/v1/auth/github`;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-xs animate-fade-in text-center">
        <h1 className="mb-10 text-[28px] font-bold tracking-tight">
          <span className="underline decoration-2 underline-offset-[3px]">un</span>forgit<span className="text-foreground/40">.remote</span>
        </h1>

        <button
          onClick={handleGitHubLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/10 px-5 py-3 text-[15px] font-medium text-foreground transition-all hover:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <Github className="h-5 w-5" />
              Sign in with GitHub
            </>
          )}
        </button>
      </div>
    </div>
  );
}
