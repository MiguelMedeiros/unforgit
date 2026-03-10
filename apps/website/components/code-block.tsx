"use client";

import { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { motion } from "framer-motion";

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div whileHover={{ scale: 1.02 }} className="relative inline-block">
      <div className="inline-flex items-center gap-3 px-5 py-3 rounded-lg bg-dracula-current/40 border border-dracula-comment/30">
        <Terminal className="w-4 h-4 text-dracula-comment shrink-0" />
        <code className="flex-1 text-dracula-foreground font-mono text-sm tracking-wide whitespace-nowrap">
          <span className="text-dracula-comment">$</span> {code}
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
      {copied && (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-dracula-foreground font-medium"
        >
          Copied!
        </motion.span>
      )}
    </motion.div>
  );
}
