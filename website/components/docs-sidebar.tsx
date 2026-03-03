"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Brain,
  Terminal,
  Server,
  Container,
  Code2,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  {
    id: "overview",
    title: "Overview",
    icon: Brain,
  },
  {
    id: "cli",
    title: "CLI Reference",
    icon: Terminal,
    subsections: [
      { id: "cli-core", title: "Core Commands" },
      { id: "cli-lifecycle", title: "Memory Lifecycle" },
      { id: "cli-links", title: "Links" },
      { id: "cli-consolidation", title: "Consolidation" },
      { id: "cli-sync", title: "Sync" },
      { id: "cli-remote", title: "Remote Config" },
      { id: "cli-branches", title: "Branches" },
      { id: "cli-viewing", title: "Viewing" },
      { id: "cli-auth", title: "Auth & Config" },
    ],
  },
  {
    id: "mcp",
    title: "MCP Server",
    icon: Server,
    subsections: [
      { id: "mcp-setup", title: "Setup in Cursor" },
      { id: "mcp-tools", title: "Available Tools" },
      { id: "mcp-cursor-rule", title: "Cursor Rule" },
    ],
  },
  {
    id: "docker",
    title: "Docker Deployment",
    icon: Container,
    subsections: [
      { id: "docker-services", title: "Services" },
      { id: "docker-env", title: "Environment Variables" },
      { id: "docker-commands", title: "Commands" },
    ],
  },
  {
    id: "api",
    title: "API Reference",
    icon: Code2,
    subsections: [
      { id: "api-auth", title: "Authentication" },
      { id: "api-memory", title: "Memory Endpoints" },
      { id: "api-sync", title: "Sync Endpoints" },
      { id: "api-keys", title: "API Keys" },
    ],
  },
  {
    id: "config",
    title: "Configuration",
    icon: Settings,
    subsections: [
      { id: "config-yaml", title: "hippo.yaml" },
      { id: "config-env", title: "Environment Variables" },
    ],
  },
];

export function DocsSidebar() {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isUserClickRef = useRef(false);
  const userClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = useCallback(() => {
    if (isUserClickRef.current) return;

    const scrollPosition = window.scrollY + 150;

    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];

      if (section.subsections) {
        for (let j = section.subsections.length - 1; j >= 0; j--) {
          const sub = section.subsections[j];
          const subElement = document.getElementById(sub.id);
          if (subElement && subElement.offsetTop <= scrollPosition) {
            setActiveSection(sub.id);
            return;
          }
        }
      }

      const element = document.getElementById(section.id);
      if (element && element.offsetTop <= scrollPosition) {
        setActiveSection(section.id);
        return;
      }
    }

    setActiveSection("overview");
  }, []);

  useEffect(() => {
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
      if (!section?.subsections) return false;
      return section.subsections.some((sub) => sub.id === activeSection);
    },
    [activeSection]
  );

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-dracula-background border border-dracula-current"
        aria-label="Toggle sidebar"
      >
        {isMobileOpen ? (
          <X className="w-5 h-5 text-dracula-foreground" />
        ) : (
          <Menu className="w-5 h-5 text-dracula-foreground" />
        )}
      </button>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 pt-6 pb-8 px-4 overflow-y-auto",
          "bg-dracula-background border-r border-dracula-current/50",
          "transition-transform duration-300",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="mb-6">
          <a
            href="/"
            className="flex items-center gap-2 text-dracula-foreground hover:text-dracula-purple transition-colors"
          >
            <Brain className="w-6 h-6 text-dracula-purple" />
            <span className="font-bold text-lg">Hippocampus</span>
          </a>
          <p className="text-xs text-dracula-comment mt-2">
            Technical Documentation
          </p>
        </div>

        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isSectionActive = activeSection === section.id;
            const hasActiveSubsection = isSubsectionOfSection(section.id);
            const hasSubsections =
              section.subsections && section.subsections.length > 0;

            return (
              <div key={section.id}>
                <button
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                    isSectionActive
                      ? "bg-dracula-purple/20 text-dracula-purple font-medium"
                      : hasActiveSubsection
                        ? "text-dracula-purple/80"
                        : "text-dracula-foreground/70 hover:bg-dracula-current/30 hover:text-dracula-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{section.title}</span>
                </button>

                {hasSubsections && (
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-dracula-current/50 pl-3">
                    {section.subsections!.map((sub) => {
                      const isSubActive = activeSection === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => scrollToSection(sub.id)}
                          className={cn(
                            "w-full text-left px-2 py-1.5 text-sm rounded transition-colors",
                            isSubActive
                              ? "text-dracula-purple font-medium bg-dracula-purple/10"
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
