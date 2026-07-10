"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Brain,
  Terminal,
  Server,
  Code2,
  Settings,
  Menu,
  X,
  Search,
  Sparkles,
  GitMerge,
  Plug,
  Key,
  Globe,
  AlertTriangle,
  Monitor,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const mainSections = [
  {
    id: "overview",
    title: "Overview",
    icon: Brain,
  },
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Sparkles,
    subsections: [
      { id: "init-flow", title: "Install And First Flow" },
      { id: "lifecycle-loop", title: "Lifecycle Loop" },
      { id: "templates", title: "Templates" },
    ],
  },
  {
    id: "recall",
    title: "Recall & Ranking",
    icon: Search,
    subsections: [
      { id: "recall-behavior", title: "How Recall Works" },
      { id: "embeddings", title: "Embeddings" },
    ],
  },
  {
    id: "cli",
    title: "CLI Reference",
    icon: Terminal,
    subsections: [
      { id: "cli-core", title: "Core Commands" },
      { id: "cli-lifecycle", title: "Lifecycle And Consolidation" },
      { id: "cli-links", title: "Links And History" },
      { id: "cli-sync", title: "Sync And Diagnostics" },
    ],
  },
  {
    id: "mcp",
    title: "MCP Server",
    icon: Server,
    href: "/docs/mcp",
  },
  {
    id: "api",
    title: "API Reference",
    icon: Code2,
    subsections: [
      { id: "api-auth", title: "Authentication" },
      { id: "api-memory", title: "Memory Endpoints" },
      { id: "api-lifecycle", title: "Lifecycle Endpoints" },
      { id: "api-links", title: "Links Endpoints" },
      { id: "api-ai", title: "AI Endpoints" },
      { id: "api-sync", title: "Sync Endpoints" },
    ],
  },
  {
    id: "config",
    title: "Configuration",
    icon: Settings,
    subsections: [
      { id: "config-yaml", title: "unforgit.yaml" },
      { id: "config-env", title: "Environment Variables" },
    ],
  },
  {
    id: "deployment",
    title: "Deployment & AI",
    icon: GitMerge,
    subsections: [
      { id: "deployment-docker", title: "Docker Services" },
      { id: "deployment-ai", title: "Server-Side AI" },
    ],
  },
];

const mcpSections = [
  { id: "mcp-overview", title: "How It Works", icon: Plug },
  { id: "mcp-prerequisites", title: "Prerequisites", icon: Terminal },
  {
    id: "mcp-ides",
    title: "IDE Setup",
    icon: Monitor,
    subsections: [
      { id: "mcp-cursor", title: "Cursor" },
      { id: "mcp-claude-code", title: "Claude Code (CLI)" },
      { id: "mcp-claude-desktop", title: "Claude Desktop" },
      { id: "mcp-windsurf", title: "Windsurf" },
      { id: "mcp-vscode-copilot", title: "VS Code + Copilot" },
      { id: "mcp-cline", title: "Cline" },
      { id: "mcp-roo", title: "Roo Code" },
      { id: "mcp-codex", title: "Codex CLI" },
      { id: "mcp-opencode", title: "OpenCode" },
      { id: "mcp-kilo", title: "Kilo Code" },
      { id: "mcp-continue", title: "Continue" },
      { id: "mcp-other", title: "Other Clients" },
    ],
  },
  {
    id: "mcp-keys",
    title: "API Keys",
    icon: Key,
    subsections: [
      { id: "mcp-remote-key", title: "Remote API Key" },
      { id: "mcp-openai-key", title: "OpenAI Key" },
    ],
  },
  {
    id: "mcp-remote",
    title: "Remote Server",
    icon: Globe,
    subsections: [
      { id: "mcp-remote-config", title: "Configure URL" },
      { id: "mcp-remote-docker", title: "Run the Server" },
      { id: "mcp-remote-connect", title: "Connect Client" },
    ],
  },
  { id: "mcp-tools", title: "Available Tools", icon: Server },
  { id: "mcp-ide-rules", title: "IDE Rules", icon: BookOpen },
  { id: "mcp-troubleshooting", title: "Troubleshooting", icon: AlertTriangle },
];

export function DocsSidebar() {
  const pathname = usePathname();
  const isMcpPage = pathname === "/docs/mcp";
  const sections = isMcpPage ? mcpSections : mainSections;
  const defaultSection = isMcpPage ? "mcp-overview" : "overview";

  const [activeSection, setActiveSection] = useState<string>(defaultSection);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isUserClickRef = useRef(false);
  const userClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = useCallback(() => {
    if (isUserClickRef.current) return;

    const scrollPosition = window.scrollY + 150;
    let newActive = defaultSection;

    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];

      if ("subsections" in section && section.subsections) {
        let found = false;
        for (let j = section.subsections.length - 1; j >= 0; j--) {
          const sub = section.subsections[j];
          const subElement = document.getElementById(sub.id);
          if (subElement && subElement.offsetTop <= scrollPosition) {
            newActive = sub.id;
            found = true;
            break;
          }
        }
        if (found) break;
      }

      const element = document.getElementById(section.id);
      if (element && element.offsetTop <= scrollPosition) {
        newActive = section.id;
        break;
      }
    }

    setActiveSection(newActive);
    const currentHash = window.location.hash.slice(1);
    if (currentHash !== newActive) {
      history.replaceState(null, "", `#${newActive}`);
    }
  }, [sections, defaultSection]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const el = document.getElementById(hash);
      if (el) {
        setActiveSection(hash);
        isUserClickRef.current = true;
        const offset = 100;
        const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: "smooth" });
        userClickTimeoutRef.current = setTimeout(() => {
          isUserClickRef.current = false;
        }, 800);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      isUserClickRef.current = true;

      if (userClickTimeoutRef.current) {
        clearTimeout(userClickTimeoutRef.current);
      }

      setActiveSection(id);
      history.pushState(null, "", `#${id}`);

      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({ top: offsetPosition, behavior: "smooth" });

      userClickTimeoutRef.current = setTimeout(() => {
        isUserClickRef.current = false;
      }, 800);
    }
    setIsMobileOpen(false);
  }, []);

  const isSubsectionOfSection = useCallback(
    (sectionId: string) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section || !("subsections" in section) || !section.subsections)
        return false;
      return section.subsections.some((sub) => sub.id === activeSection);
    },
    [activeSection, sections]
  );

  return (
    <>
      {/* Mobile top header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-dracula-background/95 backdrop-blur-xl border-b border-dracula-current/30">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-1.5 rounded-lg hover:bg-dracula-current/30 transition-colors"
              aria-label="Toggle sidebar"
            >
              {isMobileOpen ? (
                <X className="w-5 h-5 text-dracula-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-dracula-foreground" />
              )}
            </button>
            <a
              href="/"
              className="text-dracula-foreground hover:text-dracula-foreground transition-colors"
            >
              <span className="font-bold text-lg tracking-tight"><span className="underline decoration-2 underline-offset-[3px]">un</span>forgit</span>
            </a>
            <span className="text-xs text-dracula-comment">/</span>
            <span className="text-xs text-dracula-comment">docs</span>
          </div>
        </div>
      </div>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 z-40 w-64 pb-8 px-6 pt-4 overflow-y-auto",
          "bg-dracula-background border-r border-dracula-current/50",
          "transition-transform duration-300",
          "top-[65px] h-[calc(100vh-65px)] lg:top-0 lg:h-screen lg:pt-4",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Desktop-only header inside sidebar */}
        <div className="hidden lg:block mb-6">
          <a
            href="/"
            className="flex items-center gap-2 text-dracula-foreground hover:text-dracula-foreground transition-colors"
          >
            <span className="font-bold text-lg tracking-tight"><span className="underline decoration-2 underline-offset-[3px]">un</span>forgit</span>
          </a>
          <p className="text-xs text-dracula-comment mt-2">
            Technical Documentation
          </p>
        </div>

        {isMcpPage && (
          <Link
            href="/docs"
            className="flex items-center gap-2 px-3 py-2 mb-3 text-sm text-dracula-comment hover:text-dracula-foreground transition-colors rounded-lg hover:bg-dracula-current/20"
          >
            <span className="text-xs">&larr;</span>
            Back to Docs
          </Link>
        )}

        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isSectionActive = activeSection === section.id;
            const hasActiveSubsection = isSubsectionOfSection(section.id);
            const hasSubsections =
              "subsections" in section &&
              section.subsections &&
              section.subsections.length > 0;
            const isLink = "href" in section && section.href;

            if (isLink) {
              return (
                <Link
                  key={section.id}
                  href={(section as { href: string }).href}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                    isMcpPage
                      ? "bg-dracula-foreground/10 text-dracula-foreground font-medium"
                      : "text-dracula-foreground/70 hover:bg-dracula-current/30 hover:text-dracula-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{section.title}</span>
                  <span className="text-xs text-dracula-comment">&rarr;</span>
                </Link>
              );
            }

            return (
              <div key={section.id}>
                <button
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                    isSectionActive
                      ? "bg-dracula-foreground/10 text-dracula-foreground font-medium"
                      : hasActiveSubsection
                        ? "text-dracula-foreground/80"
                        : "text-dracula-foreground/70 hover:bg-dracula-current/30 hover:text-dracula-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{section.title}</span>
                </button>

                {hasSubsections && (
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-dracula-current/50 pl-3">
                    {(
                      section as {
                        subsections: { id: string; title: string }[];
                      }
                    ).subsections.map((sub) => {
                      const isSubActive = activeSection === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => scrollToSection(sub.id)}
                          className={cn(
                            "w-full text-left px-2 py-1.5 text-sm rounded transition-colors",
                            isSubActive
                              ? "text-dracula-foreground font-medium bg-dracula-foreground/10"
                              : "text-dracula-foreground/60 hover:text-dracula-foreground hover:bg-dracula-current/20"
                          )}
                        >
                          {sub.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
