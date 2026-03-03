"use client";

import { motion } from "framer-motion";
import { StepsList, Step } from "./steps-list";

const steps: Step[] = [
  {
    number: "01",
    command: "hippo init",
    title: "Initialize",
    description: "Set up Hippocampus in your repository",
  },
  {
    number: "02",
    command: 'hippo add "Found bug in auth flow"',
    title: "Store Memories",
    description: "AI agents save decisions and discoveries as they work",
  },
  {
    number: "03",
    command: 'hippo recall "authentication"',
    title: "Recall Context",
    description: "Query memories at the start of each session",
  },
  {
    number: "04",
    command: "hippo promote <memory-id>",
    title: "Share with Team",
    description: "Promote valuable memories to the shared remote",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">How it works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Four simple steps to give your AI agents persistent memory.
          </p>
        </motion.div>

        <StepsList steps={steps} />
      </div>
    </section>
  );
}
