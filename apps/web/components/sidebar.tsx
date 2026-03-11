"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
      <div className="px-5 py-5">
        <span className="text-[15px] font-bold tracking-tight text-foreground">
          <span className="underline decoration-2 underline-offset-[3px]">un</span>forgit
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
                  active ? "text-white" : "",
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
