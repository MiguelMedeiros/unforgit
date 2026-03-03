"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalProps {
  code: string;
  title?: string;
  showLineNumbers?: boolean;
  language?: "bash" | "json" | "yaml" | "text";
}

function highlightBash(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  if (remaining.startsWith("$ ")) {
    parts.push(
      <span key={key++} className="text-dracula-green">
        $
      </span>
    );
    parts.push(<span key={key++}> </span>);
    remaining = remaining.slice(2);
  }

  if (remaining.startsWith("# ")) {
    parts.push(
      <span key={key++} className="text-dracula-comment italic">
        {remaining}
      </span>
    );
    return parts;
  }

  const tokens = remaining.split(/(\s+)/);
  let isFirstWord = true;

  for (const token of tokens) {
    if (token.match(/^\s+$/)) {
      parts.push(<span key={key++}>{token}</span>);
      continue;
    }

    if (isFirstWord && token) {
      parts.push(
        <span key={key++} className="text-dracula-cyan font-semibold">
          {token}
        </span>
      );
      isFirstWord = false;
      continue;
    }

    if (token.startsWith("--") || token.startsWith("-")) {
      parts.push(
        <span key={key++} className="text-dracula-pink">
          {token}
        </span>
      );
    } else if (token.startsWith('"') || token.startsWith("'")) {
      parts.push(
        <span key={key++} className="text-dracula-yellow">
          {token}
        </span>
      );
    } else if (token.match(/^https?:\/\//)) {
      parts.push(
        <span key={key++} className="text-dracula-cyan underline">
          {token}
        </span>
      );
    } else if (token.match(/^\d+$/)) {
      parts.push(
        <span key={key++} className="text-dracula-purple">
          {token}
        </span>
      );
    } else {
      parts.push(
        <span key={key++} className="text-dracula-foreground">
          {token}
        </span>
      );
    }
  }

  return parts;
}

function highlightJson(code: string): React.ReactNode {
  try {
    const lines = code.split("\n");
    return lines.map((line, i) => {
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let key = 0;

      const keyMatch = remaining.match(/^(\s*)"([^"]+)":/);
      if (keyMatch) {
        parts.push(<span key={key++}>{keyMatch[1]}</span>);
        parts.push(
          <span key={key++} className="text-dracula-pink">
            &quot;{keyMatch[2]}&quot;
          </span>
        );
        parts.push(
          <span key={key++} className="text-dracula-foreground">
            :
          </span>
        );
        remaining = remaining.slice(keyMatch[0].length);
      }

      const stringMatch = remaining.match(/^\s*"([^"]*)"/);
      if (stringMatch) {
        const leadingSpace = remaining.match(/^\s*/)?.[0] || "";
        parts.push(<span key={key++}>{leadingSpace}</span>);
        parts.push(
          <span key={key++} className="text-dracula-yellow">
            &quot;{stringMatch[1]}&quot;
          </span>
        );
        remaining = remaining.slice(leadingSpace.length + stringMatch[0].trim().length);
      }

      if (remaining.match(/true|false/)) {
        remaining = remaining.replace(/(true|false)/g, (match) => `{{BOOL:${match}}}`);
      }
      if (remaining.match(/\d+/)) {
        remaining = remaining.replace(/(\d+)/g, (match) => `{{NUM:${match}}}`);
      }
      if (remaining.match(/null/)) {
        remaining = remaining.replace(/null/g, "{{NULL}}");
      }

      const finalParts = remaining.split(/({{[^}]+}})/);
      for (const part of finalParts) {
        if (part.startsWith("{{BOOL:")) {
          const value = part.slice(7, -2);
          parts.push(
            <span key={key++} className="text-dracula-purple">
              {value}
            </span>
          );
        } else if (part.startsWith("{{NUM:")) {
          const value = part.slice(6, -2);
          parts.push(
            <span key={key++} className="text-dracula-purple">
              {value}
            </span>
          );
        } else if (part === "{{NULL}}") {
          parts.push(
            <span key={key++} className="text-dracula-orange">
              null
            </span>
          );
        } else {
          parts.push(
            <span key={key++} className="text-dracula-foreground">
              {part}
            </span>
          );
        }
      }

      return (
        <div key={i} className="leading-relaxed">
          {parts}
        </div>
      );
    });
  } catch {
    return <span className="text-dracula-foreground">{code}</span>;
  }
}

function highlightYaml(code: string): React.ReactNode {
  const lines = code.split("\n");
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let key = 0;

    if (line.trim().startsWith("#")) {
      return (
        <div key={i} className="leading-relaxed text-dracula-comment italic">
          {line}
        </div>
      );
    }

    const keyMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*):/);
    if (keyMatch) {
      parts.push(<span key={key++}>{keyMatch[1]}</span>);
      parts.push(
        <span key={key++} className="text-dracula-pink">
          {keyMatch[2]}
        </span>
      );
      parts.push(
        <span key={key++} className="text-dracula-foreground">
          :
        </span>
      );
      const rest = line.slice(keyMatch[0].length);
      if (rest.trim()) {
        parts.push(
          <span key={key++} className="text-dracula-yellow">
            {rest}
          </span>
        );
      }
    } else if (line.trim().startsWith("-")) {
      const indent = line.match(/^(\s*)/)?.[0] || "";
      parts.push(<span key={key++}>{indent}</span>);
      parts.push(
        <span key={key++} className="text-dracula-cyan">
          -
        </span>
      );
      parts.push(
        <span key={key++} className="text-dracula-yellow">
          {line.slice(indent.length + 1)}
        </span>
      );
    } else {
      parts.push(
        <span key={key++} className="text-dracula-foreground">
          {line}
        </span>
      );
    }

    return (
      <div key={i} className="leading-relaxed">
        {parts}
      </div>
    );
  });
}

export function Terminal({
  code,
  title = "Terminal",
  showLineNumbers = false,
  language = "bash",
}: TerminalProps) {
  const [copied, setCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCopy = async () => {
    const cleanCode = code
      .split("\n")
      .map((line) => (line.startsWith("$ ") ? line.slice(2) : line))
      .join("\n");
    await navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedCode = useMemo(() => {
    if (language === "json") {
      return highlightJson(code);
    }
    if (language === "yaml") {
      return highlightYaml(code);
    }
    if (language === "bash") {
      const lines = code.split("\n");
      return lines.map((line, i) => (
        <div key={i} className="leading-relaxed">
          {highlightBash(line)}
        </div>
      ));
    }
    return <span className="text-dracula-foreground">{code}</span>;
  }, [code, language]);

  const lines = code.split("\n");

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
      className="rounded-lg overflow-hidden border border-dracula-current/50 bg-[#1e1f29] shadow-xl"
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-dracula-background border-b border-dracula-current/30">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 transition-colors" />
          </div>
          <span className="text-xs text-dracula-comment ml-2 font-medium">
            {title}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
            copied
              ? "bg-dracula-green/20 text-dracula-green"
              : "text-dracula-comment hover:text-dracula-foreground hover:bg-dracula-current/30"
          )}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </motion.button>
      </div>

      {/* Code content */}
      <div className="p-4 overflow-x-auto">
        <div className="flex">
          {showLineNumbers && (
            <div className="pr-4 border-r border-dracula-current/30 mr-4 select-none">
              {lines.map((_, i) => (
                <div
                  key={i}
                  className="text-xs text-dracula-comment/50 leading-relaxed text-right font-mono"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          )}
          <pre className="flex-1 font-mono text-sm">{highlightedCode}</pre>
        </div>
      </div>
    </Wrapper>
  );
}

export function TerminalInline({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const cleanCode = code.startsWith("$ ") ? code.slice(2) : code;
    await navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e1f29] border border-dracula-current/50"
    >
      <span className="text-dracula-green font-mono text-sm">$</span>
      <code className="font-mono text-sm text-dracula-foreground">{code}</code>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleCopy}
        className="p-1 rounded hover:bg-dracula-current/50 transition-colors ml-1"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-dracula-green" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-dracula-comment hover:text-dracula-foreground" />
        )}
      </motion.button>
    </motion.div>
  );
}
