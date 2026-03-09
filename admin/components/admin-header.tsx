"use client";

import { useRouter } from "next/navigation";
import { Brain, LogOut } from "lucide-react";
import { clearToken } from "@/lib/api";

export function AdminHeader() {
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  return (
    <header className="flex items-center justify-between border-b border-border/50 bg-[rgba(18,18,18,0.8)] px-6 py-4 glass-subtle">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-dracula-purple/90 to-dracula-purple shadow-[0_2px_8px_rgba(189,147,249,0.3)]">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
            <span className="underline decoration-2 underline-offset-[3px]">Un</span>forgit Admin
          </h1>
          <p className="text-[11px] text-muted-foreground">
            API Key Management
          </p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </header>
  );
}
