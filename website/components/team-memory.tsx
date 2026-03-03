"use client";

import { motion } from "framer-motion";
import { Lock, Users } from "lucide-react";
import Image from "next/image";

export function TeamMemory() {
  return (
    <section id="team-memory" className="py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            <span className="text-gradient">Local vs Shared</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your AI keeps personal notes locally. When ready, promote them to
            the team&apos;s shared memory with one command.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="relative mb-10"
        >
          <div className="relative rounded-2xl overflow-hidden border border-dracula-cyan/30 shadow-2xl shadow-dracula-cyan/10">
            <Image
              src="/team-memory.png"
              alt="Private local memories vs shared team memories"
              width={1024}
              height={512}
              className="w-full h-auto"
            />
          </div>
          <div className="absolute -inset-1 bg-gradient-to-r from-dracula-cyan/20 via-dracula-green/20 to-dracula-purple/20 rounded-2xl blur-xl -z-10" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="flex gap-4 p-5 rounded-xl bg-dracula-background/80 border border-dracula-purple/30">
            <div className="p-2.5 h-fit rounded-lg bg-dracula-purple/20">
              <Lock className="w-5 h-5 text-dracula-purple" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Private Memory</h3>
              <p className="text-sm text-muted-foreground">
                Personal notes, local configs, WIP ideas. Stored in SQLite, never leaves your machine.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-5 rounded-xl bg-dracula-background/80 border border-dracula-cyan/30">
            <div className="p-2.5 h-fit rounded-lg bg-dracula-cyan/20">
              <Users className="w-5 h-5 text-dracula-cyan" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Team Memory</h3>
              <p className="text-sm text-muted-foreground">
                Bug fixes, architecture decisions, deploy procedures. Synced via PostgreSQL to everyone.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
