"use client";

import {
  Database,
  Brain,
  Plug,
  Terminal,
  LayoutDashboard,
  GitMerge,
  KeyRound,
  History,
  Search,
  Sparkles,
  Users,
  Zap,
  Server,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Search,
    title: "Semantic Search",
    description: "AI embeddings find by meaning, not keywords.",
    color: "text-dracula-purple",
  },
  {
    icon: Database,
    title: "Local + Remote",
    description: "SQLite local, PostgreSQL + pgvector for teams.",
    color: "text-dracula-cyan",
  },
  {
    icon: Brain,
    title: "Memory Types",
    description: "Episodic, semantic, or procedural.",
    color: "text-dracula-purple",
  },
  {
    icon: Plug,
    title: "MCP Ready",
    description: "Works with Cursor & Claude.",
    color: "text-dracula-green",
  },
  {
    icon: Terminal,
    title: "Templates",
    description: "decision, gotcha, playbook, bug...",
    color: "text-dracula-orange",
  },
  {
    icon: Sparkles,
    title: "Smart Curation",
    description: "AI suggests consolidations & cleanups.",
    color: "text-dracula-pink",
  },
  {
    icon: Users,
    title: "Team Dashboard",
    description: "Leaderboard, top memories, health.",
    color: "text-dracula-yellow",
  },
  {
    icon: GitMerge,
    title: "Auto-Sync",
    description: "Background sync with conflict resolution.",
    color: "text-dracula-red",
  },
  {
    icon: Zap,
    title: "Quality Score",
    description: "Track memory health & usage.",
    color: "text-dracula-cyan",
  },
  {
    icon: Server,
    title: "Server-Side AI",
    description: "Centralized AI for teams. One API key for all.",
    color: "text-dracula-green",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

export function Features() {
  return (
    <section id="features" className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-gradient-purple">Everything you need</span>
          </h2>
          <p className="text-muted-foreground">
            A complete memory system for AI agents and dev teams.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -3, scale: 1.02 }}
              className={cn(
                "group p-4 rounded-xl",
                "bg-dracula-background/80 border border-dracula-current/50",
                "hover:border-dracula-purple/50 transition-all duration-300",
                "hover:shadow-lg hover:shadow-dracula-purple/10"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    "bg-secondary group-hover:bg-dracula-current/50",
                    "transition-colors duration-300"
                  )}
                >
                  <feature.icon className={cn("w-4 h-4", feature.color)} />
                </div>
                <h3 className="text-sm font-semibold">{feature.title}</h3>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed pl-11">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
