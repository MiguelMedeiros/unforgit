"use client";

import { motion } from "framer-motion";
import { BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StepsList, Step } from "./steps-list";

const installSteps: Step[] = [
  {
    number: "01",
    title: "Install globally",
    command: "npm install -g hippocampus",
    description: "Install the CLI tool globally on your system.",
  },
  {
    number: "02",
    title: "Initialize in your project",
    command: "cd your-project && hippo init",
    description: "Sets up local storage, Cursor rules, and MCP configuration.",
  },
  {
    number: "03",
    title: "Configure remote server",
    command: "hippo config set remote.url https://hippo.example.com",
    description: "Set the URL of your shared Hippocampus server.",
  },
  {
    number: "04",
    title: "Authenticate",
    command: "hippo auth set hk_your_api_key",
    description: "Configure API key for push/pull operations.",
  },
  {
    number: "05",
    title: "Enable AI consolidation (optional)",
    command: "hippo auth openai sk_your_openai_key",
    description: "Set OpenAI API key for AI-powered memory consolidation.",
  },
];

export function Installation() {
  return (
    <section id="install" className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient-purple">Quick Install</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in under a minute.
          </p>
        </motion.div>

        <StepsList steps={installSteps} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12"
        >
          <Link href="/docs">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "p-6 rounded-xl",
                "bg-linear-to-r from-dracula-purple/10 via-dracula-pink/10 to-dracula-cyan/10",
                "border border-dracula-purple/30",
                "flex items-center justify-between gap-4",
                "cursor-pointer group",
                "transition-all duration-300"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-dracula-purple/20 group-hover:bg-dracula-purple/30 transition-colors">
                  <BookOpen className="w-6 h-6 text-dracula-purple" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-dracula-foreground group-hover:text-dracula-purple transition-colors">
                    Explore the Documentation
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    CLI commands, MCP setup, API reference, and more
                  </p>
                </div>
              </div>
              <motion.div
                className="text-dracula-purple"
                initial={{ x: 0 }}
                whileHover={{ x: 5 }}
              >
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.div>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
