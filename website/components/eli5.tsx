"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const faqs = [
  {
    question: "What's the problem?",
    answer:
      "Every time you start a new chat with an AI agent, it forgets everything. You have to explain the same things over and over again.",
  },
  {
    question: "What does Hippocampus do?",
    answer:
      "It gives AI agents a memory. Like how your brain's hippocampus helps you remember things, this tool helps AI remember what happened in your project.",
  },
  {
    question: "How does it work?",
    answer:
      "When the AI learns something important (like a bug fix or a decision), it saves it. Next time, it checks its memories first before asking you the same questions.",
  },
  {
    question: "Can my team use it too?",
    answer:
      "Yes! You can keep memories private or share them with your team. So everyone's AI agents learn from each other's discoveries.",
  },
];

export function ELI5() {
  return (
    <section id="eli5" className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">Explain Like I&apos;m 5</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            No jargon. Just simple answers.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="rounded-xl overflow-hidden border border-dracula-current/30">
            <Image
              src="/eli5-cartoon.png"
              alt="Illustration showing AI memory concept"
              width={1024}
              height={512}
              className="w-full h-auto"
              priority
            />
          </div>
        </motion.div>

        <div className="space-y-8">
          {faqs.map((item, index) => (
            <motion.div
              key={item.question}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="pb-8 border-b border-dracula-current/20 last:border-0"
            >
              <h3 className="text-lg font-semibold mb-2">{item.question}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {item.answer}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center text-muted-foreground"
        >
          <span className="font-medium text-foreground">TL;DR:</span>{" "}
          Hippocampus = long-term memory for AI agents.
        </motion.p>
      </div>
    </section>
  );
}
