"use client";

import { motion } from "framer-motion";
import { Brain } from "lucide-react";

export function SemanticSearch() {
  return (
    <section id="semantic-search" className="py-40 px-6 relative overflow-hidden">
      <div className="max-w-3xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-purple">Search by meaning,</span>
            <br />
            <span className="text-dracula-foreground">not just keywords</span>
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Traditional search finds files. Unforgit finds{" "}
            <em>knowledge</em>. Ask naturally and get the right context
            back — powered by semantic ranking.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-xl border border-dracula-current/60 bg-dracula-current/20 overflow-hidden"
        >
          <div className="px-4 py-3 bg-dracula-current/40 border-b border-dracula-current/50">
            <code className="text-sm">
              <span className="text-dracula-comment">$</span>{" "}
              <span className="text-dracula-foreground">
                unforgit recall
              </span>{" "}
              <span className="text-dracula-foreground/70">
                &quot;how to deploy&quot;
              </span>
            </code>
          </div>

          <div className="grid md:grid-cols-2 divide-x divide-dracula-current/30">
            <div className="p-5 bg-dracula-current/15">
              <p className="text-xs text-dracula-comment uppercase tracking-wider mb-3">
                Traditional Search
              </p>
              <ul className="space-y-2">
                {["deploy.sh", "deployment-guide.md"].map((r) => (
                  <li
                    key={r}
                    className="text-sm text-dracula-foreground/50 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-dracula-comment/50" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 bg-dracula-current/25">
              <p className="text-xs text-dracula-foreground/70 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Unforgit
              </p>
              <ul className="space-y-2">
                {[
                  "To release: run make build, then kubectl apply",
                  "Production rollout requires approval from #ops",
                  "Always check staging first before prod deploy",
                ].map((r) => (
                  <li
                    key={r}
                    className="text-sm text-dracula-foreground/90 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-dracula-foreground mt-1.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-6 text-center text-sm text-dracula-comment"
        >
          Works locally with FTS. Add an OpenAI key for hybrid semantic
          ranking.
        </motion.p>
      </div>
    </section>
  );
}
