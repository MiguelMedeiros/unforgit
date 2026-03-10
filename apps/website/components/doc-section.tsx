"use client";

import { motion } from "framer-motion";
import { Link as LinkIcon } from "lucide-react";

function AnchorLink({ id }: { id: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    history.pushState(null, "", `#${id}`);
    const el = document.getElementById(id);
    if (el) {
      const offset = 100;
      const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <a
      href={`#${id}`}
      onClick={handleClick}
      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-dracula-comment hover:text-dracula-foreground ml-2 shrink-0"
      aria-label={`Link to this section`}
    >
      <LinkIcon className="w-4 h-4" />
    </a>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="group text-2xl font-bold text-dracula-foreground mb-6 flex items-center gap-3"
      >
        <span className="w-1 h-6 bg-dracula-foreground rounded-full" />
        {title}
        <AnchorLink id={id} />
      </motion.h2>
      {children}
    </section>
  );
}

export function Subsection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24 mb-8">
      <h3 className="group text-lg font-semibold text-dracula-foreground mb-4 flex items-center">
        {title}
        <AnchorLink id={id} />
      </h3>
      {children}
    </div>
  );
}
