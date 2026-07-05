"use client";

import { motion } from "framer-motion";
import { FileText, ShieldCheck, GitBranch, ArrowRightLeft } from "lucide-react";
import { CodeBlock } from "./code-block";
import { UnforgitBrand } from "./unforgit-brand";

const bridgePoints = [
  {
    icon: FileText,
    title: "Import agent memory files",
    description:
      "Parse CLAUDE.md, MEMORY.md, and generic markdown bullets into typed Unforgit memories.",
  },
  {
    icon: ShieldCheck,
    title: "Conservative by default",
    description:
      "Dry-runs first, skips likely secrets and prompt-injection-like instructions, and avoids duplicates.",
  },
  {
    icon: GitBranch,
    title: "Preserve provenance",
    description:
      "Imported memories keep source file, line, heading, checksum, and optional markdown IDs for reviewable sync.",
  },
  {
    icon: ArrowRightLeft,
    title: "Export back to Claude",
    description:
      "Generate Claude-compatible markdown from curated active memory, with stable Unforgit IDs embedded.",
  },
];

export function MarkdownBridge() {
  const mobileCommands = [
    {
      label: "Import",
      parts: ["unforgit md import", "CLAUDE.md", "--dry-run"],
    },
    {
      label: "Export",
      parts: ["unforgit md export", "--format claude", "--out CLAUDE.md"],
    },
  ];

  return (
    <section id="markdown-bridge" className="py-28 md:py-40 px-5 md:px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-dracula-current/10 to-transparent" />
      <div className="max-w-4xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dracula-current/50 border border-dracula-comment/30 mb-6">
            <FileText className="w-4 h-4 text-dracula-foreground/70" />
            <span className="text-sm font-mono text-dracula-foreground/80">
              New in v0.9.0
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-purple">Bridge every agent&apos;s</span>
            <br />
            <span className="text-dracula-foreground">markdown memory</span>
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            <UnforgitBrand /> now imports and exports the memory files your coding
            agents already use, so <code>CLAUDE.md</code>, <code>MEMORY.md</code>,
            and curated repository knowledge can stay in sync.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid md:grid-cols-2 gap-4 mb-10"
        >
          {bridgePoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.2 + index * 0.05 }}
                className="rounded-xl border border-dracula-current/50 bg-dracula-current/20 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-dracula-foreground/10 text-dracula-foreground shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-dracula-foreground mb-1">
                      {point.title}
                    </h3>
                    <p className="text-sm text-dracula-foreground/65 leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="hidden md:grid lg:grid-cols-2 gap-4"
        >
          <CodeBlock code="unforgit md import CLAUDE.md --dry-run" />
          <CodeBlock code="unforgit md export --format claude --out CLAUDE.md" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="grid gap-3 md:hidden"
        >
          {mobileCommands.map((command) => (
            <div
              key={command.label}
              className="rounded-2xl border border-dracula-current/40 bg-dracula-current/15 p-4"
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-dracula-foreground/55">
                {command.label}
              </div>
              <code className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-[13px] leading-relaxed text-dracula-foreground">
                {command.parts.map((part) => (
                  <span
                    key={part}
                    className="rounded-md bg-dracula-background/70 px-2 py-1"
                  >
                    {part}
                  </span>
                ))}
              </code>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
