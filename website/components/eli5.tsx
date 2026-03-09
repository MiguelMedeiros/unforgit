"use client";

import { motion } from "framer-motion";

const faqs = [
  {
    question: "What's the problem?",
    answer:
      "Every time you start a new chat with an AI agent, it forgets everything. You have to explain the same things over and over again.",
  },
  {
    question: "What does Unforgit do?",
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
    <section id="eli5" className="py-40 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">Explain Like I&apos;m 5</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            No jargon. Just simple answers.
          </p>
        </motion.div>

        <div className="space-y-6">
          {faqs.map((item, index) => (
            <motion.div
              key={item.question}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ x: 4 }}
              className="group p-6 rounded-xl border border-transparent hover:border-dracula-current/40 hover:bg-dracula-current/10 transition-all duration-300"
            >
              <h3 className="text-lg font-semibold mb-2 group-hover:text-dracula-foreground transition-colors">
                {item.question}
              </h3>
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
          Unforgit = long-term memory for AI agents.
        </motion.p>
      </div>
    </section>
  );
}
