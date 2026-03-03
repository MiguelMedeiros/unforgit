"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, LayoutDashboard, Database, History, GitFork, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/memories", label: "Memories", icon: Database },
  { href: "/history", label: "History", icon: History },
  { href: "/graph", label: "Graph", icon: GitFork },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 bg-[rgba(18,18,18,0.8)] px-6 glass-subtle">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-b from-apple-blue/90 to-apple-blue shadow-[0_2px_8px_rgba(10,132,255,0.3)]">
            <Brain className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Hippocampus
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
                  active
                    ? "bg-white/10 text-white"
                    : "text-[#98989d] hover:bg-white/[0.05] hover:text-[#d1d1d6]"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-apple-blue" : ""
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <p className="text-[11px] text-muted-foreground/60">v0.1.0</p>
    </header>
  );
}
