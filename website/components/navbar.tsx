"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Github, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#team-memory", label: "Team Memory" },
  { href: "#eli5", label: "ELI5" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#install", label: "Install" },
];

export function Navbar() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  const updateActiveSection = useCallback(() => {
    const sections = navLinks.map((link) => link.href.replace("#", ""));
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
      const heroSection = document.querySelector("section");
      if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        setIsVisible(window.scrollY > heroBottom - 100);
      }
      updateActiveSection();
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [updateActiveSection]);

  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
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
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "fixed top-0 left-0 right-0 z-50",
            "bg-dracula-background/80 backdrop-blur-xl",
            "border-b border-dracula-current/50",
            "shadow-lg shadow-black/10"
          )}
        >
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <a
                href="#"
                className="flex items-center gap-2 text-dracula-foreground hover:text-dracula-purple transition-colors"
                onClick={scrollToTop}
              >
                <Brain className="w-6 h-6 text-dracula-purple" />
                <span className="font-bold text-lg">Hippocampus</span>
              </a>

              <div className="hidden md:flex items-center gap-6">
                {navLinks.map((link) => {
                  const sectionId = link.href.replace("#", "");
                  const isActive = activeSection === sectionId;
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleSmoothScroll(e, link.href)}
                      className={cn(
                        "text-sm transition-colors relative",
                        isActive
                          ? "text-dracula-purple font-medium"
                          : "text-dracula-foreground/70 hover:text-dracula-foreground"
                      )}
                    >
                      {link.label}
                      {isActive && (
                        <motion.span
                          layoutId="activeSection"
                          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-dracula-purple rounded-full"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </a>
                  );
                })}
              </div>

              <div className="hidden md:flex items-center gap-3">
                <a
                  href="https://github.com/hippocampus-dev/hippocampus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
                    "text-sm text-dracula-foreground/80",
                    "hover:bg-dracula-current/50 transition-colors"
                  )}
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
                <a
                  href="#install"
                  onClick={(e) => handleSmoothScroll(e, "#install")}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-dracula-purple text-dracula-background text-sm font-semibold",
                    "hover:bg-dracula-purple/90 transition-colors"
                  )}
                >
                  Get Started
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
                  <div className="pt-4 pb-2 flex flex-col gap-2">
                    {navLinks.map((link) => {
                      const sectionId = link.href.replace("#", "");
                      const isActive = activeSection === sectionId;
                      return (
                        <a
                          key={link.href}
                          href={link.href}
                          onClick={(e) => handleSmoothScroll(e, link.href)}
                          className={cn(
                            "px-3 py-2 text-sm rounded-lg transition-colors",
                            isActive
                              ? "text-dracula-purple bg-dracula-purple/10 font-medium"
                              : "text-dracula-foreground/70 hover:text-dracula-foreground hover:bg-dracula-current/30"
                          )}
                        >
                          {link.label}
                        </a>
                      );
                    })}
                    <hr className="border-dracula-current/50 my-2" />
                    <a
                      href="https://github.com/hippocampus-dev/hippocampus"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-dracula-foreground/80 hover:bg-dracula-current/30 rounded-lg transition-colors"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </a>
                    <a
                      href="#install"
                      onClick={(e) => handleSmoothScroll(e, "#install")}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg mt-2",
                        "bg-dracula-purple text-dracula-background text-sm font-semibold",
                        "hover:bg-dracula-purple/90 transition-colors"
                      )}
                    >
                      Get Started
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
