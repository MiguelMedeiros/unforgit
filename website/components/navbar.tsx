"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#eli5", label: "about" },
  { href: "#mcp-integrations", label: "integrations" },
  { href: "#team-memory", label: "team" },
  { href: "#dashboard", label: "dashboard" },
  { href: "/docs", label: "docs", external: true },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);

  const updateActiveSection = useCallback(() => {
    const sections = navLinks
      .filter((l) => !l.external)
      .map((link) => link.href.replace("#", ""));
    const navbarHeight = 100;

    for (let i = sections.length - 1; i >= 0; i--) {
      const section = document.getElementById(sections[i]);
      if (section) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= navbarHeight) {
          setActiveSection(sections[i]);
          return;
        }
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
      const navbarHeight = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }

    setIsMobileMenuOpen(false);
  };

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-dracula-background/80 backdrop-blur-xl border-b border-dracula-current/30"
          : "bg-transparent"
      )}
    >
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <a
            href="#"
            className="text-dracula-foreground hover:text-dracula-foreground transition-colors"
            onClick={scrollToTop}
          >
            <span className="font-bold text-lg tracking-tight">unforgit</span>
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

          <button
            className="md:hidden p-2 text-dracula-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden"
            >
              <div className="pt-6 pb-4 flex flex-col gap-1">
                {navLinks.map((link) => {
                  const sectionId = link.href.replace("#", "");
                  const isActive =
                    !link.external && activeSection === sectionId;

                  if (link.external) {
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        className="px-3 py-2.5 text-sm text-dracula-foreground/50 hover:text-dracula-foreground rounded-lg transition-colors"
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
                        "px-3 py-2.5 text-sm rounded-lg transition-colors",
                        isActive
                          ? "text-dracula-foreground bg-dracula-foreground/5"
                          : "text-dracula-foreground/50 hover:text-dracula-foreground"
                      )}
                    >
                      {link.label}
                    </a>
                  );
                })}
                <hr className="border-dracula-current/30 my-3" />
                <a
                  href="https://github.com/miguelmedeiros/unforgit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2.5 text-sm text-dracula-foreground/50 hover:text-dracula-foreground rounded-lg transition-colors"
                >
                  <Github className="w-4 h-4" />
                  github
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
