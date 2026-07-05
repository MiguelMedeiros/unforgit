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
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UnforgitBrand } from "./unforgit-brand";

const navLinks = [
  { href: "#why", label: "why unforgit?", icon: HelpCircle },
  { href: "#get-started", label: "get started", icon: Rocket },
  { href: "#team-memory", label: "team memory", icon: Users },
  { href: "#semantic-search", label: "semantic search", icon: Search },
  { href: "#markdown-bridge", label: "md bridge", icon: FileText },
  { href: "#dashboard", label: "dashboard", icon: LayoutDashboard },
  { href: "#mcp-integrations", label: "mcp server", icon: Server },
  { href: "/docs", label: "docs", external: true, icon: FileText },
];

const mobilePrimaryLinks = [
  { href: "#get-started", label: "start", icon: Rocket },
  { href: "#semantic-search", label: "search", icon: Search },
  { href: "#markdown-bridge", label: "bridge", icon: FileText },
  { href: "/docs", label: "docs", external: true, icon: FileText },
];

const mobileMoreLinks = [
  { href: "#why", label: "Why Unforgit?", icon: HelpCircle },
  { href: "#team-memory", label: "Team memory", icon: Users },
  { href: "#dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "#mcp-integrations", label: "MCP server", icon: Server },
];

export function Navbar() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      setMobileMenuOpen(false);
    }
  };

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
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

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="absolute left-3 right-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] rounded-2xl border border-dracula-current/40 bg-dracula-background/95 shadow-2xl shadow-black/40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-dracula-current/30">
              <span className="text-sm font-semibold text-dracula-foreground/80">
                More sections
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-dracula-foreground/60 active:text-dracula-foreground active:bg-dracula-current/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {mobileMoreLinks.map((link) => {
                const Icon = link.icon;
                const sectionId = link.href.replace("#", "");
                const isActive = activeSection === sectionId;

                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors",
                      isActive
                        ? "border-dracula-foreground/40 bg-dracula-foreground/10 text-dracula-foreground"
                        : "border-dracula-current/30 bg-dracula-current/20 text-dracula-foreground/70 active:text-dracula-foreground active:bg-dracula-current/40"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-medium">{link.label}</span>
                  </a>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Bottom navigation bar — mobile only. Keep it sparse; overflow lives in More. */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-dracula-background/95 backdrop-blur-xl border-t border-dracula-current/30 shadow-2xl shadow-black/40">
        <div className="grid grid-cols-5 items-center gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {mobilePrimaryLinks.map((link) => {
            const sectionId = link.href.replace("#", "");
            const isActive = !link.external && activeSection === sectionId;
            const Icon = link.icon;

            if (link.external) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl text-dracula-foreground/55 active:text-dracula-foreground transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-medium leading-none">{link.label}</span>
                </a>
              );
            }

            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl transition-colors",
                  isActive
                    ? "bg-dracula-foreground/10 text-dracula-foreground"
                    : "text-dracula-foreground/55 active:text-dracula-foreground active:bg-dracula-current/40"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium leading-none">{link.label}</span>
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
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className={cn(
              "relative flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl transition-colors",
              mobileMenuOpen
                ? "bg-dracula-foreground/10 text-dracula-foreground"
                : "text-dracula-foreground/55 active:text-dracula-foreground active:bg-dracula-current/40"
            )}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] font-medium leading-none">more</span>
          </button>
        </div>
      </div>
    </>
  );
}
