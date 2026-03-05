"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  LayoutDashboard,
  Database,
  GitFork,
  History,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/memories", label: "Memories", icon: Database },
  { href: "/curation", label: "Curation", icon: Sparkles },
  { href: "/team", label: "Team", icon: Users },
  { href: "/history", label: "History", icon: History },
  { href: "/graph", label: "Graph", icon: GitFork },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[220px] flex-col border-r border-border/50 bg-[rgba(18,18,18,0.8)] glass-subtle">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-b from-dracula-purple/90 to-dracula-purple shadow-[0_2px_8px_rgba(189,147,249,0.3)]">
          <Brain className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Hippocampus
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pt-2">
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
                "flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all duration-200",
                active
                  ? "bg-white/10 text-white"
                  : "text-[#98989d] hover:bg-white/[0.05] hover:text-[#d1d1d6]",
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px]",
                  active ? "text-dracula-purple" : "",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4">
        <p className="text-[11px] text-muted-foreground/60">v0.1.0</p>
      </div>
    </aside>
  );
}
