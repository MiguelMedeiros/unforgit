"use client";

import { motion } from "framer-motion";
import { Bot, Brain, CheckCircle2, PlugZap } from "lucide-react";
import { CodeBlock } from "./code-block";
import { cn } from "@/lib/utils";

const features = [
  "Shows up as a Hermes memory provider",
  "Automatic recall through Hermes' prefetch flow",
  "Mirrors explicit Hermes memory writes into Unforgit",
  "Adds unforgit_search, unforgit_remember, and unforgit_status tools",
];

export function HermesIntegration() {
  return (
    <section id="hermes-integration" className="py-40 px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dracula-purple/10 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dracula-purple/10 border border-dracula-purple/30 mb-6">
            <PlugZap className="w-4 h-4 text-dracula-purple" />
            <span className="text-sm text-dracula-purple font-medium">
              Native Hermes support
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-purple">Built for Hermes Agent</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unforgit can run as a Hermes memory plugin: project knowledge is
            recalled automatically, while Hermes keeps its built-in user profile
            memory intact.
          </p>
        </motion.div>

        <div className="grid min-w-0 md:grid-cols-2 gap-6 items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className={cn(
              "min-w-0 p-6 md:p-8 rounded-2xl border border-dracula-comment/30",
              "bg-dracula-background/70 backdrop-blur-sm"
            )}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-dracula-cyan/10 border border-dracula-cyan/30">
                <Bot className="w-6 h-6 text-dracula-cyan" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-dracula-foreground">
                  One agent, two memory layers
                </h3>
                <p className="text-sm text-muted-foreground">
                  Personal profile + repository knowledge
                </p>
              </div>
            </div>

            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 text-dracula-green shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={cn(
              "min-w-0 p-6 md:p-8 rounded-2xl border border-dracula-purple/30",
              "bg-linear-to-br from-dracula-purple/10 via-dracula-background/80 to-dracula-cyan/10"
            )}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-dracula-purple/10 border border-dracula-purple/30">
                <Brain className="w-6 h-6 text-dracula-purple" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-dracula-foreground">
                  Enable it in Hermes
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select Unforgit as your memory provider
                </p>
              </div>
            </div>

            <CodeBlock
              code={`hermes memory setup
# choose unforgit

hermes config set memory.provider unforgit
hermes config set memory.memory_enabled true`}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
