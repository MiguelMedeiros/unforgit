"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Layers,
  Key,
  ScrollText,
} from "lucide-react";

interface RepoTabsProps {
  org: string;
  repo: string;
  activeTab?: "dashboard" | "graph" | "consolidation" | "keys" | "logs";
  onTabChange?: (tab: "dashboard" | "graph") => void;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "" },
  { id: "graph", label: "Graph", icon: GitBranch, href: "?view=graph" },
  { id: "consolidation", label: "Consolidation", icon: Layers, href: "/consolidation" },
  { id: "keys", label: "API Keys", icon: Key, href: "/keys" },
  { id: "logs", label: "Logs", icon: ScrollText, href: "/logs" },
] as const;

export function RepoTabs({ org, repo, activeTab, onTabChange }: RepoTabsProps) {
  const pathname = usePathname();
  const basePath = `/repos/${org}/${repo}`;

  const getActiveTab = (): string => {
    if (activeTab) return activeTab;
    if (pathname.endsWith("/logs")) return "logs";
    if (pathname.endsWith("/keys")) return "keys";
    if (pathname.endsWith("/consolidation")) return "consolidation";
    return "dashboard";
  };

  const currentTab = getActiveTab();

  const renderTab = (tab: (typeof tabs)[number]) => {
    const isActive = currentTab === tab.id;
    const Icon = tab.icon;

    const className = `flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-[13px] font-medium transition-colors ${
      isActive
        ? "bg-white/10 text-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
    }`;

    const content = (
      <>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span>{tab.label}</span>
      </>
    );

    if ((tab.id === "dashboard" || tab.id === "graph") && onTabChange) {
      return (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as "dashboard" | "graph")}
          className={className}
        >
          {content}
        </button>
      );
    }

    const href =
      tab.id === "dashboard" || tab.id === "graph"
        ? `${basePath}${tab.href}`
        : `${basePath}${tab.href}`;

    return (
      <Link key={tab.id} href={href} className={className}>
        {content}
      </Link>
    );
  };

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-1 sm:gap-2 rounded-xl border border-border/30 bg-dracula-current p-1 sm:p-1.5 min-w-max">
        {tabs.map(renderTab)}
      </div>
    </div>
  );
}
