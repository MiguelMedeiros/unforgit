"use client";

import { Github, BookOpen, Package } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UnforgitBrand } from "./unforgit-brand";

const links = [
  {
    title: "GitHub",
    href: "https://github.com/miguelmedeiros/unforgit",
    icon: Github,
    description: "View source code",
  },
  {
    title: "Documentation",
    href: "/docs",
    icon: BookOpen,
    description: "Technical docs",
  },
  {
    title: "NPM Package",
    href: "https://www.npmjs.com/package/unforgit",
    icon: Package,
    description: "NPM registry",
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-2"
          >
            <div className="flex items-center gap-3 mb-4">
              <UnforgitBrand className="text-xl font-bold tracking-tight" />
            </div>
            <p className="text-muted-foreground max-w-sm">
              Repository memory system for AI agents and developers. Store,
              recall, and share knowledge across sessions.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="font-semibold mb-4">Links</h3>
            <ul className="space-y-3">
              {links.map((link, index) => (
                <motion.li
                  key={link.title}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                >
                  <motion.a
                    whileHover={{ x: 5 }}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 text-muted-foreground",
                      "hover:text-foreground transition-colors"
                    )}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.title}
                  </motion.a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="font-semibold mb-4">Quick Start</h3>
            <div className="space-y-2 text-sm font-mono text-muted-foreground">
              <p>
                <span className="text-dracula-comment">$</span> npm i -g
                unforgit
              </p>
              <p>
                <span className="text-dracula-comment">$</span> unforgit init
              </p>
              <p>
                <span className="text-dracula-comment">$</span> unforgit web
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <p className="text-sm text-muted-foreground">
            v0.1.0 · MIT License · Built by{" "}
            <motion.a
              href="https://miguelmedeiros.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dracula-foreground/70 hover:text-dracula-foreground transition-colors font-medium"
              whileHover={{ scale: 1.05 }}
            >
              Miguel Medeiros
            </motion.a>
          </p>
          <div className="flex items-center gap-4">
            <motion.a
              whileHover={{ scale: 1.2, rotate: 360 }}
              transition={{ duration: 0.3 }}
              href="https://github.com/miguelmedeiros/unforgit"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </motion.a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
