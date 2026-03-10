"use client";

import { motion } from "framer-motion";
import { BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StepsList, Step } from "./steps-list";

const steps: Step[] = [
  {
    number: "01",
    command: "npm install -g unforgit",
    title: "Install",
    description: "Install the CLI globally on your system.",
  },
  {
    number: "02",
    command: "unforgit init",
    title: "Initialize",
    description: "Run inside your project folder. Sets up storage, config, and MCP integration.",
  },
];

export function HowItWorks() {
  return (
    <section id="get-started" className="py-40 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">Get Started</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Two commands. That's all it takes.
          </p>
        </motion.div>

        <StepsList steps={steps} />

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
                "bg-linear-to-r from-dracula-foreground/5 via-dracula-foreground/5 to-dracula-foreground/5",
                "border border-dracula-comment/30",
                "flex items-center justify-between gap-4",
                "cursor-pointer group",
                "transition-all duration-300"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-dracula-foreground/10 group-hover:bg-dracula-foreground/15 transition-colors">
                  <BookOpen className="w-6 h-6 text-dracula-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-dracula-foreground group-hover:text-dracula-foreground transition-colors">
                    Explore the Documentation
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Remote setup, team sync, AI features, API reference, and more
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-dracula-foreground group-hover:translate-x-1 transition-transform" />
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
