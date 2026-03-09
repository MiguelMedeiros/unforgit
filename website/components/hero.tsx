"use client";

import { Brain, ArrowRight, Terminal, Copy, Check, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { ParticlesBackground } from "./particles-background";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const installCommand = "npm install -g unforgit";

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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <Brain className="w-4 h-4 text-dracula-foreground/70" />
          <span className="text-sm text-dracula-foreground/80">
            Local-First Repository Memory
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-3xl md:text-5xl font-bold mb-4 text-dracula-foreground"
        >
          AI forgets everything.
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-5xl md:text-8xl font-black mb-8 tracking-tight text-dracula-foreground"
        >
          We fix that.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-xl md:text-2xl text-dracula-foreground/90 max-w-2xl mx-auto mb-8"
        >
          Long-term memory for AI agents and developer workflows.<br />
          <span className="text-dracula-foreground">Capture locally, rank by reuse, share when it matters.</span>
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
              const element = document.getElementById("install");
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
          className="relative inline-block"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative"
          >
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-lg bg-dracula-current/40 border border-dracula-comment/30">
              <Terminal className="w-4 h-4 text-dracula-comment shrink-0" />
              <code className="text-dracula-foreground font-mono text-sm tracking-wide whitespace-nowrap">
                <span className="text-dracula-comment">$</span>{" "}
                <span className="text-dracula-foreground">npm</span>{" "}
                <span className="text-dracula-foreground">install -g</span>{" "}
                <span className="text-dracula-foreground font-semibold">unforgit</span>
              </code>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-dracula-current/50 transition-colors shrink-0"
                aria-label="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-dracula-foreground" />
                ) : (
                  <Copy className="w-4 h-4 text-dracula-comment hover:text-dracula-foreground transition-colors" />
                )}
              </motion.button>
            </div>
          </motion.div>
          {copied && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-dracula-foreground font-medium"
            >
              Copied to clipboard!
            </motion.span>
          )}
        </motion.div>
      </div>

      <motion.a
        href="#mcp-integrations"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-dracula-foreground/50 hover:text-dracula-foreground transition-colors cursor-pointer z-10"
        onClick={(e) => {
          e.preventDefault();
          const element = document.getElementById("mcp-integrations");
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
