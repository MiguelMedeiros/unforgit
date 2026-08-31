"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuthState } from "@/lib/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrated, isAuthenticated } = useAdminAuthState();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
