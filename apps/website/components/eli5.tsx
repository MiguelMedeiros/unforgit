"use client";

import { motion } from "framer-motion";
import { UnforgitBrand } from "./unforgit-brand";
import type { ReactNode } from "react";

const faqs: { question: ReactNode; answer: ReactNode }[] = [
  {
    question: "What's the problem?",
    answer:
      "Every time you start a new chat with an AI agent, it forgets everything. You have to explain the same things over and over again.",
  },
  {
    question: <>What does <UnforgitBrand /> do?</>,
    answer:
      "It gives AI agents a memory. Like how your brain stores long-term memories, this tool helps AI remember what happened in your project.",
  },
  {
    question: "How does it work?",
    answer:
      "When the AI learns something important (like a bug fix or a decision), it saves it. Next time, it checks its memories first before asking you the same questions.",
  },
  {
    question: "Can my team use it too?",
    answer:
      "Yes! You can keep memories private or share them with your team. All AI agents learn from each other.",
  },
];

export function ELI5() {
  return (
    <section id="why" className="py-24 md:py-40 px-5 md:px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">Why <UnforgitBrand />?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            The problem, the solution, and how it all works.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {faqs.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group relative p-5 md:p-6 rounded-xl border border-dracula-current/20 bg-dracula-current/5 hover:border-dracula-purple/40 hover:bg-dracula-current/10 transition-all duration-300"
            >
              <div className="flex items-start gap-3.5 md:gap-4">
                <span className="shrink-0 flex items-center justify-center w-9 h-9 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-dracula-purple/10 text-dracula-purple text-sm font-bold border border-dracula-purple/20">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base md:text-base font-semibold mb-2 leading-snug group-hover:text-dracula-foreground transition-colors">
                    {item.question}
                  </h3>
                  <p className="text-[15px] md:text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 md:mt-14 text-center"
        >
          <p className="mx-auto flex w-full max-w-sm flex-col items-center gap-1.5 rounded-2xl border border-dracula-current/20 bg-dracula-current/5 px-5 py-4 text-sm text-muted-foreground md:inline-flex md:w-auto md:max-w-none md:flex-row md:gap-2 md:rounded-full md:px-5 md:py-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground md:text-sm md:normal-case md:tracking-normal">
              TL;DR
            </span>
            <span className="hidden h-4 w-px bg-dracula-current/30 md:block" />
            <span className="text-center leading-relaxed">
              <UnforgitBrand /> = long-term memory for AI agents.
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
