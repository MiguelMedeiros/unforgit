"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brain, Loader2, Lock } from "lucide-react";
import { getToken, setToken } from "@/lib/api";

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

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-dracula-purple/90 to-dracula-purple shadow-[0_4px_16px_rgba(189,147,249,0.3)]">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-bold tracking-tight">
              Unforgit Admin
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Enter your password to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-border/50 bg-dracula-current/20 p-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-[13px] font-medium text-muted-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    autoFocus
                    required
                    className="w-full rounded-xl border border-border/50 bg-white/[0.04] py-2.5 pl-10 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:border-dracula-purple/50 focus:outline-none focus:ring-1 focus:ring-dracula-purple/30 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-dracula-red/10 border border-dracula-red/20 px-3 py-2">
                  <p className="text-[13px] text-dracula-red">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-dracula-purple px-4 py-2.5 text-[14px] font-medium text-dracula-background transition-all hover:bg-dracula-purple/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
