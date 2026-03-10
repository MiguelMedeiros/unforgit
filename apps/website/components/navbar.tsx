"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Github,
  HelpCircle,
  Rocket,
  Search,
  Users,
  LayoutDashboard,
  Server,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UnforgitBrand } from "./unforgit-brand";

const navLinks = [
  { href: "#why", label: "why unforgit?", icon: HelpCircle },
  { href: "#get-started", label: "get started", icon: Rocket },
  { href: "#team-memory", label: "team memory", icon: Users },
  { href: "#semantic-search", label: "semantic search", icon: Search },
  { href: "#dashboard", label: "dashboard", icon: LayoutDashboard },
  { href: "#mcp-integrations", label: "mcp server", icon: Server },
  { href: "/docs", label: "docs", external: true, icon: FileText },
];

export function Navbar() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);

  const updateActiveSection = useCallback(() => {
    const sectionIds = navLinks
      .filter((l) => !l.external)
      .map((link) => link.href.replace("#", ""));

    const elements = sectionIds
      .map((id) => ({ id, el: document.getElementById(id) }))
      .filter((s): s is { id: string; el: HTMLElement } => s.el !== null);

    elements.sort(
      (a, b) => a.el.getBoundingClientRect().top - b.el.getBoundingClientRect().top
    );

    const viewportMid = window.innerHeight / 2;

    for (let i = elements.length - 1; i >= 0; i--) {
      const rect = elements[i].el.getBoundingClientRect();
      if (rect.top <= viewportMid) {
        setActiveSection(elements[i].id);
        return;
      }
    }
    setActiveSection("");
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      updateActiveSection();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [updateActiveSection]);

  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const targetId = href.replace("#", "");
    const element = document.getElementById(targetId);

    if (element) {
      const isMobile = window.innerWidth < 768;
      const offset = isMobile ? 20 : 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Top navbar — visible on all sizes, only logo + links on desktop */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-dracula-background/80 backdrop-blur-xl border-b border-dracula-current/30"
            : "bg-transparent"
        )}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <a
              href="#"
              className="text-dracula-foreground hover:text-dracula-foreground transition-colors"
              onClick={scrollToTop}
            >
              <UnforgitBrand className="font-bold text-lg tracking-tight" />
            </a>

            <div className="hidden md:flex items-center gap-7">
              {navLinks.map((link) => {
                const sectionId = link.href.replace("#", "");
                const isActive =
                  !link.external && activeSection === sectionId;

                if (link.external) {
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className="text-sm text-dracula-foreground/50 hover:text-dracula-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  );
                }

                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                    className={cn(
                      "text-sm transition-colors relative",
                      isActive
                        ? "text-dracula-foreground"
                        : "text-dracula-foreground/50 hover:text-dracula-foreground"
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="activeNav"
                        className="absolute -bottom-1 left-0 right-0 h-px bg-dracula-foreground/70 rounded-full"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                  </a>
                );
              })}
              <a
                href="https://github.com/miguelmedeiros/unforgit"
                target="_blank"
                rel="noopener noreferrer"
                className="text-dracula-foreground/50 hover:text-dracula-foreground transition-colors ml-1"
                aria-label="GitHub"
              >
                <Github className="w-[18px] h-[18px]" />
              </a>
            </div>

            {/* GitHub icon on mobile top bar */}
            <a
              href="https://github.com/miguelmedeiros/unforgit"
              target="_blank"
              rel="noopener noreferrer"
              className="md:hidden text-dracula-foreground/50 hover:text-dracula-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </nav>

      {/* Bottom navigation bar — mobile only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-dracula-background/95 backdrop-blur-xl border-t border-dracula-current/30">
        <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {navLinks.map((link) => {
            const sectionId = link.href.replace("#", "");
            const isActive = !link.external && activeSection === sectionId;
            const Icon = link.icon;

            if (link.external) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-dracula-foreground/40 active:text-dracula-foreground transition-colors min-w-14"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{link.label}</span>
                </a>
              );
            }

            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors min-w-14",
                  isActive
                    ? "text-dracula-foreground"
                    : "text-dracula-foreground/40 active:text-dracula-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{link.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeMobileNav"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-dracula-foreground"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}
              </a>
            );
          })}
        </div>
      </div>
    </>
  );
}
