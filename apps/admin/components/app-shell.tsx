"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/" || pathname === "/auth/callback";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header />
      <main className="flex-1 overflow-hidden">{children}</main>
      <Footer />
    </div>
  );
}
