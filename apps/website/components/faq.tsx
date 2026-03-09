"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Is Unforgit free?",
    answer:
      "Yes — Unforgit is 100% open source under the MIT license. You can use it, modify it, and self-host it with zero cost.",
  },
  {
    question: "Where are memories stored?",
    answer:
      "Memories live inside your project in the .unforgit/ folder. You own your data — nothing is sent to external servers unless you choose to set up a shared team instance.",
  },
  {
    question: "Which AI tools does it support?",
    answer:
      "Any MCP-compatible client works out of the box: Cursor, Claude Desktop, VS Code, Windsurf, GitHub Copilot, and more. If your tool speaks MCP, it speaks Unforgit.",
  },
  {
    question: "How does semantic search differ from regular search?",
    answer:
      "Regular search matches exact keywords. Semantic search understands meaning — so searching for \"auth bug\" can find a memory about \"login session token expired\", even without overlapping words.",
  },
  {
    question: "Does it work with teams?",
    answer:
      "Yes. You can keep memories private or share them across your team through a shared Unforgit server. Every teammate's AI agent benefits from collective knowledge.",
  },
  {
    question: "Can I self-host it?",
    answer:
      "Absolutely. Unforgit is designed to be self-hosted. Run it locally with a single command or deploy it on your own infrastructure with Docker.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Less than 10 seconds. Install the CLI with npm and run unforgit init — that's it, your AI agent already has persistent memory.",
  },
  {
    question: "Will it slow down my AI agent?",
    answer:
      "No. Memory recall happens in milliseconds via local vector search. The MCP protocol adds negligible overhead to your existing workflow.",
  },
];

function FAQItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: (typeof faqs)[0];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <button
        onClick={onToggle}
        className={cn(
          "w-full text-left p-5 rounded-xl border transition-all duration-300",
          isOpen
            ? "border-dracula-purple/40 bg-dracula-current/15"
            : "border-dracula-current/20 bg-dracula-current/5 hover:border-dracula-comment/30 hover:bg-dracula-current/10"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm md:text-base font-semibold text-dracula-foreground">
            {item.question}
          </h3>
          <ChevronDown
            className={cn(
              "w-4 h-4 shrink-0 text-dracula-comment transition-transform duration-300",
              isOpen && "rotate-180"
            )}
          />
        </div>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <p className="text-sm text-muted-foreground leading-relaxed mt-3 pr-8">
                {item.answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-40 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-purple">Frequently Asked</span>
            <br />
            <span className="text-dracula-foreground">Questions</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Everything you need to know about Unforgit.
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          {faqs.map((item, i) => (
            <FAQItem
              key={item.question}
              item={item}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
