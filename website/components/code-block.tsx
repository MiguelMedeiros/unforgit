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
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="flex items-center gap-2 px-4 py-3 rounded-lg bg-dracula-background border border-dracula-current"
    >
      <Terminal className="w-4 h-4 text-dracula-green shrink-0" />
      <code className="flex-1 text-dracula-foreground font-mono text-sm overflow-x-auto">
        {code}
      </code>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleCopy}
        className="p-1.5 rounded hover:bg-dracula-current transition-colors shrink-0"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-4 h-4 text-dracula-green" />
        ) : (
          <Copy className="w-4 h-4 text-dracula-comment" />
        )}
      </motion.button>
    </motion.div>
  );
}
