"use client";

import { Github, ArrowRight, Sparkles, Rocket } from "lucide-react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ParticlesBackground } from "./particles-background";

export function CTASection() {
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
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      <ParticlesBackground id="tsparticles-cta" />

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

      <motion.div
        className="absolute bottom-20 left-20 w-80 h-80 bg-white/4 rounded-full blur-3xl"
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
        className="absolute top-20 right-20 w-72 h-72 bg-white/3 rounded-full blur-3xl"
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

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dracula-current/50 border border-dracula-comment/30 mb-8"
        >
          <Sparkles className="w-4 h-4 text-dracula-foreground/70" />
          <span className="text-sm text-dracula-foreground/80">
            Ready to level up?
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          <span className="text-dracula-foreground">Give your AI a </span>
          <span className="text-gradient">brain upgrade.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          Join thousands of developers who are building smarter AI workflows.
          Open source, self-hosted, and ready in under 5 minutes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            href="https://github.com/miguelmedeiros/unforgit"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-2 px-8 py-4 rounded-lg",
              "bg-dracula-foreground text-dracula-background font-semibold text-lg",
              "hover:bg-dracula-foreground/90 transition-all duration-200",
              "glow"
            )}
          >
            <Github className="w-5 h-5" />
            Star on GitHub
            <ArrowRight className="w-5 h-5" />
          </motion.a>
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
              "inline-flex items-center gap-2 px-8 py-4 rounded-lg",
              "bg-secondary border border-border font-semibold text-lg",
              "hover:bg-accent transition-all duration-200"
            )}
          >
            <Rocket className="w-5 h-5" />
            Get Started Now
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-dracula-foreground/50 animate-pulse" />
            <span>100% Open Source</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-dracula-foreground/50 animate-pulse" />
            <span>Self-Hosted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-dracula-foreground/50 animate-pulse" />
            <span>MIT License</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
