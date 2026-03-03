"use client";

import { motion } from "framer-motion";
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
          whileHover={{ scale: 1.01 }}
          className="mt-12 p-6 rounded-xl bg-card border border-border"
        >
          <h3 className="text-lg font-semibold mb-4">CLI Commands</h3>
          <div className="space-y-3 font-mono text-sm">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="flex items-start gap-2"
            >
              <span className="text-dracula-green">hippo config list</span>
              <span className="text-dracula-comment ml-2">
                # view all settings
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.45 }}
              className="flex items-start gap-2"
            >
              <span className="text-dracula-green">hippo auth status</span>
              <span className="text-dracula-comment ml-2">
                # check auth status
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="flex items-start gap-2"
            >
              <span className="text-dracula-green">hippo push</span>
              <span className="text-dracula-comment ml-2">
                # sync to remote
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
