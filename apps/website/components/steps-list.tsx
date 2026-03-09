"use client";

import { motion } from "framer-motion";
import { CodeBlock } from "./code-block";

export interface Step {
  number: string;
  title: string;
  command: string;
  description: string;
}

interface StepsListProps {
  steps: Step[];
}

export function StepsList({ steps }: StepsListProps) {
  return (
    <div className="space-y-8">
      {steps.map((step, index) => (
        <motion.div
          key={step.number}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="flex gap-6"
        >
          <div className="shrink-0 w-12 text-2xl font-bold text-dracula-foreground/30">
            {step.number}
          </div>

          <div className="flex-1 pb-8 border-b border-dracula-current/20 last:border-0">
            <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {step.description}
            </p>
            <CodeBlock code={step.command} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
