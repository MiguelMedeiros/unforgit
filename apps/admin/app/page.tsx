"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Github } from "lucide-react";
import { getToken, setToken, getApiBaseUrl } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (getToken()) {
      router.replace("/keys");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid password");
        return;
      }

      setToken(data.token);
      router.push("/keys");
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    window.location.href = `${getApiBaseUrl()}/v1/auth/github`;
  };

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="text-center">
            <h1 className="text-[28px] font-bold tracking-tight">
              <span className="underline decoration-2 underline-offset-[3px]">un</span>forgit<span className="text-foreground/40">.remote</span>
            </h1>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Sign in to continue
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/30 bg-dracula-current p-6">
          <div className="space-y-4">
            <button
              onClick={handleGitHubLogin}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-[14px] font-medium text-foreground transition-all hover:bg-white/15"
            >
              <Github className="h-4 w-4" />
              Sign in with GitHub
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-dracula-current px-2 text-muted-foreground">
                  or continue with password
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-[13px] font-medium text-muted-foreground"
                  >
                    Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className="w-full rounded-xl border border-border/50 bg-white/[0.04] py-2.5 pl-10 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-[13px] text-destructive">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/30 bg-white/5 px-4 py-2.5 text-[14px] font-medium text-foreground/70 transition-all hover:bg-white/10 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In with Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
