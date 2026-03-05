"use client";

import { motion } from "framer-motion";
import { Search, Brain, Zap, ArrowRight, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const searchExamples = [
  {
    query: "how to deploy",
    traditional: ["deploy.sh", "deployment-guide.md"],
    semantic: [
      "To release: run make build, then kubectl apply",
      "Production rollout requires approval from #ops",
      "Always check staging first before prod deploy",
    ],
  },
  {
    query: "auth problem",
    traditional: ["auth.ts", "authentication.md"],
    semantic: [
      "OAuth callback must use HTTPS in production",
      "JWT tokens expire after 24h, refresh before",
      "Session cookie needs SameSite=Lax for Safari",
    ],
  },
];

const scoringFactors = [
  { label: "Semantic Similarity", value: 50, color: "bg-dracula-purple" },
  { label: "Text Match (FTS)", value: 20, color: "bg-dracula-cyan" },
  { label: "Recency", value: 15, color: "bg-dracula-green" },
  { label: "Confidence", value: 15, color: "bg-dracula-orange" },
];

const withoutOpenAI = [
  "Add, recall, promote memories",
  "Team sync (push/pull)",
  "Manual consolidation",
  "Web dashboard",
  "MCP integration (Cursor)",
  "Links and history",
];

const withOpenAI = [
  "Semantic search (meaning-based)",
  "Auto embedding generation",
  "AI consolidation suggestions",
  "Hybrid scoring algorithm",
];

export function SemanticSearch() {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dracula-purple/5 to-transparent" />
      
      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dracula-purple/20 border border-dracula-purple/30 mb-6">
            <Brain className="w-4 h-4 text-dracula-purple" />
            <span className="text-sm text-dracula-purple font-medium">
              Powered by OpenAI Embeddings
            </span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-purple">Search by meaning,</span>
            <br />
            <span className="text-dracula-foreground">not just keywords</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Traditional search finds files. Hippocampus finds <em>knowledge</em>.
            Our hybrid algorithm combines AI embeddings with full-text search for the best results.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Search className="w-5 h-5 text-dracula-cyan" />
              Hybrid Scoring Algorithm
            </h3>
            
            <div className="space-y-4 mb-8">
              {scoringFactors.map((factor, i) => (
                <motion.div
                  key={factor.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dracula-foreground/80">{factor.label}</span>
                    <span className="text-dracula-foreground font-mono">{factor.value}%</span>
                  </div>
                  <div className="h-2 bg-dracula-current/50 rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", factor.color)}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${factor.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-4 rounded-lg bg-dracula-current/30 border border-dracula-current/50">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-dracula-yellow shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-dracula-foreground/90 font-medium mb-1">
                    Why hybrid?
                  </p>
                  <p className="text-sm text-dracula-foreground/70">
                    Pure semantic search can miss exact matches. Pure text search misses context.
                    We combine both for precision <em>and</em> recall.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-dracula-purple" />
              See the difference
            </h3>

            {searchExamples.map((example, i) => (
              <motion.div
                key={example.query}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.15 }}
                className="rounded-xl border border-dracula-current/50 bg-dracula-background/50 overflow-hidden"
              >
                <div className="px-4 py-3 bg-dracula-current/30 border-b border-dracula-current/50">
                  <code className="text-sm">
                    <span className="text-dracula-comment">$</span>{" "}
                    <span className="text-dracula-cyan">hippo recall</span>{" "}
                    <span className="text-dracula-green">"{example.query}"</span>
                  </code>
                </div>
                
                <div className="grid md:grid-cols-2 divide-x divide-dracula-current/30">
                  <div className="p-4">
                    <p className="text-xs text-dracula-comment uppercase tracking-wider mb-3">
                      Traditional Search
                    </p>
                    <ul className="space-y-2">
                      {example.traditional.map((result) => (
                        <li key={result} className="text-sm text-dracula-foreground/50 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-dracula-comment/50" />
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-dracula-purple/5">
                    <p className="text-xs text-dracula-purple uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      Hippocampus
                    </p>
                    <ul className="space-y-2">
                      {example.semantic.map((result) => (
                        <li key={result} className="text-sm text-dracula-foreground/90 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-dracula-purple mt-1.5 shrink-0" />
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <a
            href="/docs#semantic-search"
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium",
              "bg-dracula-current/50 border border-dracula-purple/30",
              "hover:bg-dracula-purple/20 hover:border-dracula-purple/50 transition-all"
            )}
          >
            Learn how it works
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* OpenAI Optional Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-24 rounded-2xl border border-dracula-current/50 bg-gradient-to-br from-dracula-current/20 to-transparent p-8 md:p-12"
        >
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">
              <span className="text-dracula-green">Works without OpenAI</span>
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Hippocampus is fully functional without any API keys. 
              Add OpenAI when you want semantic search superpowers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="rounded-xl border border-dracula-green/30 bg-dracula-background/50 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-dracula-green/20">
                  <Check className="w-5 h-5 text-dracula-green" />
                </div>
                <h4 className="font-semibold text-dracula-foreground">
                  Without OpenAI Key
                </h4>
              </div>
              <ul className="space-y-2">
                {withoutOpenAI.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-dracula-foreground/80">
                    <Check className="w-4 h-4 text-dracula-green shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-dracula-comment">
                Search uses FTS5 (full-text search) — fast and effective for exact matches.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="rounded-xl border border-dracula-purple/30 bg-dracula-purple/5 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-dracula-purple/20">
                  <Sparkles className="w-5 h-5 text-dracula-purple" />
                </div>
                <h4 className="font-semibold text-dracula-foreground">
                  With OpenAI Key
                </h4>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-dracula-purple/20 text-dracula-purple">
                  Recommended
                </span>
              </div>
              <ul className="space-y-2">
                {withOpenAI.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-dracula-foreground/80">
                    <Sparkles className="w-4 h-4 text-dracula-purple shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-dracula-comment">
                Search by meaning, not just keywords. Find "deployment process" when searching "how to release".
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mt-8 p-4 rounded-lg bg-dracula-current/30 border border-dracula-current/50 text-center"
          >
            <code className="text-sm">
              <span className="text-dracula-comment">$</span>{" "}
              <span className="text-dracula-cyan">hippo auth openai</span>{" "}
              <span className="text-dracula-green">sk-your-api-key</span>
            </code>
            <p className="text-xs text-dracula-comment mt-2">
              Add your key anytime to unlock semantic search. Graceful fallback when not configured.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
