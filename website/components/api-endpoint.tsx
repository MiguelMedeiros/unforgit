"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Copy, Check, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiEndpointProps {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  auth?: boolean;
  requestBody?: string;
  responseExample?: string;
}

const methodColors = {
  GET: "bg-dracula-foreground",
  POST: "bg-dracula-foreground/80",
  PUT: "bg-dracula-comment",
  DELETE: "bg-dracula-comment/70",
  PATCH: "bg-dracula-comment/50",
};

export function ApiEndpoint({
  method,
  path,
  description,
  auth = true,
  requestBody,
  responseExample,
}: ApiEndpointProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const copyToClipboard = async (text: string, type: "request" | "response") => {
    await navigator.clipboard.writeText(text);
    if (type === "request") {
      setCopiedRequest(true);
      setTimeout(() => setCopiedRequest(false), 2000);
    } else {
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-lg border border-dracula-current/50 bg-dracula-background/50 overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-dracula-current/20 transition-colors"
      >
        <span
          className={cn(
            "px-2 py-0.5 rounded text-xs font-bold text-dracula-background",
            methodColors[method]
          )}
        >
          {method}
        </span>
        <code className="font-mono text-sm text-dracula-foreground flex-1 text-left">
          {path}
        </code>
        <span className="flex items-center gap-2">
          {auth ? (
            <Lock className="w-3.5 h-3.5 text-dracula-foreground/70" />
          ) : (
            <Unlock className="w-3.5 h-3.5 text-dracula-comment" />
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-dracula-comment transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </span>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-dracula-current/50"
        >
          <div className="p-4 space-y-4">
            <p className="text-sm text-dracula-foreground/70">{description}</p>

            {auth && (
              <div className="text-xs text-dracula-foreground/70 flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Requires Authorization: Bearer &lt;api-key&gt;
              </div>
            )}

            {requestBody && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-dracula-comment uppercase tracking-wider">
                    Request Body
                  </h5>
                  <button
                    onClick={() => copyToClipboard(requestBody, "request")}
                    className="p-1 rounded hover:bg-dracula-current/50 transition-colors"
                  >
                    {copiedRequest ? (
                      <Check className="w-3.5 h-3.5 text-dracula-foreground" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-dracula-comment" />
                    )}
                  </button>
                </div>
                <pre className="px-3 py-2 rounded bg-dracula-background border border-dracula-current/30 text-sm font-mono text-dracula-foreground overflow-x-auto">
                  {requestBody}
                </pre>
              </div>
            )}

            {responseExample && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-dracula-comment uppercase tracking-wider">
                    Response Example
                  </h5>
                  <button
                    onClick={() => copyToClipboard(responseExample, "response")}
                    className="p-1 rounded hover:bg-dracula-current/50 transition-colors"
                  >
                    {copiedResponse ? (
                      <Check className="w-3.5 h-3.5 text-dracula-foreground" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-dracula-comment" />
                    )}
                  </button>
                </div>
                <pre className="px-3 py-2 rounded bg-dracula-background border border-dracula-current/30 text-sm font-mono text-dracula-foreground overflow-x-auto">
                  {responseExample}
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
