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
      className="relative inline-flex w-fit max-w-full min-w-0"
    >
      <div className="inline-flex w-fit max-w-full min-w-0 items-start gap-3 overflow-hidden rounded-lg border border-dracula-comment/30 bg-dracula-current/40 px-4 py-3 sm:px-5">
        <Terminal className="mt-0.5 w-4 h-4 text-dracula-comment shrink-0" />
        <pre className="min-w-0 max-w-full overflow-x-auto whitespace-pre text-dracula-foreground font-mono text-xs leading-relaxed tracking-wide sm:text-sm">
          <code>{code}</code>
        </pre>
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
