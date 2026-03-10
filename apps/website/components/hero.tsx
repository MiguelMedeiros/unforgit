"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { ParticlesBackground } from "./particles-background";
import { CodeBlock } from "./code-block";

export function Hero() {

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 100 };
  const circle1X = useSpring(mouseX, springConfig);
  const circle1Y = useSpring(mouseY, springConfig);

  const springConfig2 = { damping: 40, stiffness: 80 };
  const circle2X = useSpring(mouseX, springConfig2);
  const circle2Y = useSpring(mouseY, springConfig2);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      const xPercent = (clientX / innerWidth - 0.5) * 100;
      const yPercent = (clientY / innerHeight - 0.5) * 100;

      mouseX.set(xPercent);
      mouseY.set(yPercent);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ParticlesBackground />

      <motion.div
        className="absolute inset-0 bg-background/40"
        animate={{
          backdropFilter: ["blur(1px)", "blur(4px)", "blur(1px)"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="absolute inset-0 bg-linear-to-b from-white/[0.03] via-transparent to-transparent" />

      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-white/[0.04] rounded-full blur-3xl"
        style={{
          x: circle1X,
          y: circle1Y,
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.04, 0.08, 0.04],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl"
        style={{
          x: circle2X,
          y: circle2Y,
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.03, 0.06, 0.03],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dracula-current/50 border border-dracula-comment/30 mb-8"
        >
          <span className="text-sm font-mono text-dracula-foreground/80">
            unforget + git = <span className="font-semibold text-dracula-foreground">unforgit</span>
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-8xl font-black mb-8 tracking-tight text-dracula-foreground"
        >
          Like{" "}
          <span className="underline decoration-dracula-purple underline-offset-4">
            git
          </span>
          , but for
          <br />
          AI memory.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg md:text-xl text-dracula-foreground/70 max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          Persistent memory for AI agents.
          <br />
          Shared across your team. Local, fast, open-source.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            href="#get-started"
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById("get-started");
              if (element) {
                element.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-lg",
              "bg-dracula-foreground text-dracula-background font-semibold",
              "hover:bg-dracula-foreground/90 transition-all duration-200",
              "glow"
            )}
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            href="#mcp-integrations"
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById("mcp-integrations");
              if (element) {
                element.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-lg",
              "bg-secondary border border-border font-semibold",
              "hover:bg-accent transition-all duration-200"
            )}
          >
            Learn More
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <CodeBlock code="npm install -g unforgit" />
        </motion.div>
      </div>

      <motion.a
        href="#why"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-dracula-foreground/50 hover:text-dracula-foreground transition-colors cursor-pointer z-10"
        onClick={(e) => {
          e.preventDefault();
          const element = document.getElementById("why");
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }}
      >
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </motion.a>
    </section>
  );
}
