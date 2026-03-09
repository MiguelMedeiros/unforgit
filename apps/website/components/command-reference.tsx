"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Terminal } from "./terminal";

interface CommandOption {
  flag: string;
  description: string;
  default?: string;
}

interface CommandReferenceProps {
  name: string;
  description: string;
  usage: string;
  args?: { name: string; description: string; required?: boolean }[];
  options?: CommandOption[];
  example?: string;
}

export function CommandReference({
  name,
  description,
  usage,
  args,
  options,
  example,
}: CommandReferenceProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const Wrapper = isMounted ? motion.div : "div";
  const wrapperProps = isMounted
    ? {
        initial: { opacity: 0, y: 10 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="rounded-lg border border-dracula-current/50 bg-dracula-background/50 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-dracula-current/50 bg-dracula-current/20">
        <h4 className="font-mono text-dracula-foreground font-semibold">{name}</h4>
        <p className="text-sm text-dracula-foreground/70 mt-1">{description}</p>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h5 className="text-xs font-semibold text-dracula-comment uppercase tracking-wider mb-2">
            Usage
          </h5>
          <Terminal code={usage} title="Usage" />
        </div>

        {args && args.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-dracula-comment uppercase tracking-wider mb-2">
              Arguments
            </h5>
            <div className="space-y-1">
              {args.map((arg) => (
                <div key={arg.name} className="flex gap-2 text-sm">
                  <code
                    className={cn(
                      "font-mono",
                      arg.required ? "text-dracula-foreground" : "text-dracula-comment"
                    )}
                  >
                    {arg.required ? `<${arg.name}>` : `[${arg.name}]`}
                  </code>
                  <span className="text-dracula-foreground/70">
                    {arg.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {options && options.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-dracula-comment uppercase tracking-wider mb-2">
              Options
            </h5>
            <div className="space-y-1.5">
              {options.map((opt) => (
                <div key={opt.flag} className="text-sm">
                  <code className="font-mono text-dracula-foreground">{opt.flag}</code>
                  <span className="text-dracula-foreground/70 ml-2">
                    {opt.description}
                  </span>
                  {opt.default && (
                    <span className="text-dracula-comment ml-1">
                      (default: {opt.default})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {example && (
          <div>
            <h5 className="text-xs font-semibold text-dracula-comment uppercase tracking-wider mb-2">
              Example
            </h5>
            <Terminal code={`$ ${example}`} title="Example" />
          </div>
        )}
      </div>
    </Wrapper>
  );
}
