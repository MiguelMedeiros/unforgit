"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Database, Network, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    id: "home",
    label: "Dashboard",
    icon: LayoutDashboard,
    image: "/dashboard-home.png",
    description:
      "Overview with stats, recent memories, activity heatmap, and charts",
  },
  {
    id: "memories",
    label: "Memories",
    icon: Database,
    image: "/dashboard-memories.png",
    description: "Browse, search, and manage all your repository memories",
  },
  {
    id: "graph",
    label: "Graph",
    icon: Network,
    image: "/dashboard-graph.png",
    description: "Visualize memory connections and relationships",
  },
];

const AUTOPLAY_INTERVAL = 5000;

export function DashboardShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeItem = tabs[activeIndex];

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % tabs.length);
  }, []);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + tabs.length) % tabs.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(goToNext, AUTOPLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, goToNext]);

  return (
    <section id="dashboard" className="py-32 px-6 bg-gradient-to-b from-transparent via-dracula-purple/5 to-transparent">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dracula-pink/10 border border-dracula-pink/30 mb-6">
            <LayoutDashboard className="w-4 h-4 text-dracula-pink" />
            <span className="text-sm text-dracula-pink font-medium">
              hippo web
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient-purple">
              Beautiful Web Dashboard
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A visual interface to explore, manage, and understand your
            repository memories. Run{" "}
            <code className="px-2 py-1 rounded bg-dracula-current text-dracula-green text-sm">
              hippo web
            </code>{" "}
            to start.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-dracula-background/80 border border-dracula-current mb-8">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  activeIndex === index
                    ? "bg-dracula-purple text-dracula-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-dracula-current/50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-5xl group">
            <div className="absolute -inset-4 bg-gradient-to-r from-dracula-purple/20 via-dracula-pink/20 to-dracula-purple/20 rounded-2xl blur-xl opacity-50" />

            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-dracula-background/80 border border-dracula-current opacity-0 group-hover:opacity-100 transition-opacity hover:bg-dracula-current"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-dracula-background/80 border border-dracula-current opacity-0 group-hover:opacity-100 transition-opacity hover:bg-dracula-current"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="relative rounded-xl overflow-hidden border border-dracula-current bg-dracula-background shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-dracula-current/50 border-b border-dracula-current">
                <span className="w-3 h-3 rounded-full bg-dracula-red" />
                <span className="w-3 h-3 rounded-full bg-dracula-yellow" />
                <span className="w-3 h-3 rounded-full bg-dracula-green" />
                <span className="ml-4 text-xs text-dracula-comment">
                  localhost:3838
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="relative aspect-video"
                >
                  <Image
                    src={activeItem.image}
                    alt={`Hippocampus ${activeItem.label}`}
                    fill
                    className="object-cover object-top"
                    priority
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {tabs.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className="relative h-2 rounded-full overflow-hidden bg-dracula-current/50 transition-all duration-300"
                  style={{ width: activeIndex === index ? 32 : 8 }}
                >
                  {activeIndex === index && (
                    <motion.div
                      className="absolute inset-0 bg-dracula-purple"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: AUTOPLAY_INTERVAL / 1000, ease: "linear" }}
                      style={{ transformOrigin: "left" }}
                      key={`progress-${activeIndex}`}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <motion.p
            key={activeIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-10 text-center text-muted-foreground"
          >
            {activeItem.description}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
