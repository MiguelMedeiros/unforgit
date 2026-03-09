"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

const MemoryGraph = memo(function MemoryGraph() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: false,
      background: { color: { value: "transparent" } },
      fpsLimit: 60,
      interactivity: {
        events: {
          onHover: { enable: true, mode: "grab" },
        },
        modes: {
          grab: { distance: 120, links: { opacity: 0.6 } },
        },
      },
      particles: {
        color: {
          value: ["#e4e4e7", "#a1a1aa", "#d4d4d8", "#71717a"],
        },
        links: {
          color: "#71717a",
          distance: 120,
          enable: true,
          opacity: 0.15,
          width: 1,
          triangles: { enable: true, opacity: 0.04 },
        },
        move: {
          direction: "none",
          enable: true,
          outModes: { default: "bounce" },
          random: true,
          speed: 0.6,
          straight: false,
          attract: { enable: true, rotateX: 600, rotateY: 1200 },
        },
        number: {
          density: { enable: true, width: 500, height: 500 },
          value: 45,
        },
        opacity: {
          value: { min: 0.3, max: 0.8 },
          animation: {
            enable: true,
            speed: 0.8,
            startValue: "random",
            sync: false,
          },
        },
        shape: { type: "circle" },
        size: {
          value: { min: 2, max: 5 },
        },
      },
      detectRetina: true,
    }),
    []
  );

  if (!init) return null;

  return (
    <Particles
      id="memory-graph"
      className="absolute inset-0"
      options={options}
    />
  );
});

function PushPulse({ side, delay }: { side: "left" | "right"; delay: number }) {
  const isLeft = side === "left";
  return (
    <motion.div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 z-10",
        isLeft ? "left-0" : "right-0"
      )}
    >
      <motion.div
        initial={{ x: isLeft ? -20 : 20, opacity: 0 }}
        animate={{
          x: isLeft ? [- 20, 80, 140] : [20, -80, -140],
          opacity: [0, 0.9, 0],
          scale: [0.5, 1.2, 0.3],
        }}
        transition={{
          duration: 3,
          delay,
          repeat: Infinity,
          repeatDelay: 4,
          ease: "easeInOut",
        }}
        className={cn(
          "w-3 h-3 rounded-full",
          isLeft ? "bg-violet-400" : "bg-sky-400"
        )}
      />
    </motion.div>
  );
}

function PushLabel({
  side,
  label,
  author,
}: {
  side: "left" | "right";
  label: string;
  author: string;
}) {
  const isLeft = side === "left";
  return (
    <div
      className={cn(
        "absolute z-20 flex flex-col gap-1",
        isLeft ? "left-3 md:left-5" : "right-3 md:right-5",
        "top-1/2 -translate-y-1/2"
      )}
    >
      <div
        className={cn(
          "px-3 py-2 rounded-lg border backdrop-blur-md",
          "border-dracula-current/60 bg-dracula-background/80"
        )}
      >
        <code className="text-[10px] md:text-xs text-dracula-foreground/70 font-mono whitespace-nowrap">
          <span className="text-dracula-comment">$</span> {label}
        </code>
        <p className="text-[9px] md:text-[10px] text-dracula-comment mt-1">
          {author}
        </p>
      </div>
    </div>
  );
}

export function TeamMemory() {
  return (
    <section id="team-memory" className="py-40 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-purple">
              Your whole team&apos;s AI
            </span>
            <br />
            <span className="text-dracula-foreground">learns together</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Memories form a living semantic graph. Each team member contributes
            knowledge that automatically links by meaning — push to share,
            pull to sync.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative rounded-xl border border-dracula-current/40 bg-dracula-background/50 overflow-hidden mb-4"
          style={{ aspectRatio: "16 / 8" }}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 md:px-5 py-3 border-b border-dracula-current/30 bg-dracula-background/60 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] md:text-xs font-medium text-dracula-comment uppercase tracking-wider">
                remote mcp server
              </span>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {[
                { color: "bg-violet-400", name: "Alice" },
                { color: "bg-sky-400", name: "Bob" },
                { color: "bg-amber-400", name: "John" },
              ].map((dev) => (
                <span
                  key={dev.name}
                  className="flex items-center gap-1.5 text-[10px] text-dracula-comment"
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", dev.color)} />
                  {dev.name}
                </span>
              ))}
            </div>
          </div>

          {/* Particle graph */}
          <MemoryGraph />

          {/* Push/pull labels */}
          <PushLabel
            side="left"
            label="unforgit push"
            author="Alice pushes a memory"
          />
          <PushLabel
            side="right"
            label="unforgit pull"
            author="Bob syncs knowledge"
          />

          {/* Animated dots traveling into the graph */}
          <PushPulse side="left" delay={0} />
          <PushPulse side="left" delay={3.5} />
          <PushPulse side="right" delay={1.5} />
          <PushPulse side="right" delay={5} />

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-dracula-background/80 to-transparent z-10 pointer-events-none" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-center text-sm text-dracula-comment mb-12"
        >
          Each dot is a memory. Links form automatically by semantic
          similarity.
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: Lock,
              title: "Private Memory",
              description:
                "Personal notes, WIP ideas, and sensitive context. Stored locally in SQLite — stays on your machine until you promote it.",
            },
            {
              icon: Users,
              title: "Team Memory",
              description:
                "Stable decisions, deploy playbooks, and conventions. Shared through the remote API so every team member's AI can recall them.",
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className={cn(
                "group flex gap-4 p-6 rounded-xl",
                "bg-dracula-current/20 border border-dracula-current/40",
                "hover:border-dracula-comment/60 transition-all duration-300",
                "hover:shadow-2xl hover:shadow-white/6",
                "hover:bg-dracula-current/30"
              )}
            >
              <div className="p-2.5 h-fit rounded-lg bg-dracula-foreground/10 group-hover:bg-dracula-foreground/15 transition-colors">
                <card.icon className="w-5 h-5 text-dracula-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{card.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
