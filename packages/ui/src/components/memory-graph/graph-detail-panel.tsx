"use client";

import * as React from "react";
import { X, Link2 } from "lucide-react";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { formatDate } from "../../utils/format";
import {
  typeColorClasses,
  linkTypeColorClasses,
} from "../../constants/memory-types";
import type { GraphNode, MemoryNode, MemoryEdge } from "./types";

interface GraphDetailPanelProps {
  selectedNode: GraphNode;
  connectedMemories: Array<{
    edge: MemoryEdge;
    node: MemoryNode | undefined;
  }>;
  onClose: () => void;
  onNavigateToNode: (nodeId: string) => void;
  onViewFullDetails?: () => void;
}

export function GraphDetailPanel({
  selectedNode,
  connectedMemories,
  onClose,
  onNavigateToNode,
  onViewFullDetails,
}: GraphDetailPanelProps) {
  return (
    <div
      style={{ width: 360, flexShrink: 0 }}
      className="border-l border-border/30 bg-[rgba(18,18,18,0.95)] glass-subtle overflow-y-auto animate-fade-in"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/20 bg-[rgba(18,18,18,0.95)] glass-subtle px-5 py-4">
        <h3 className="text-[14px] font-semibold">Memory Detail</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 w-7 p-0 rounded-full"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-1.5">
          <Badge
            className={`${typeColorClasses[selectedNode.memoryType] ?? ""} border-0`}
            variant="secondary"
          >
            {selectedNode.memoryType}
          </Badge>
          <Badge variant="outline">{selectedNode.status}</Badge>
        </div>

        <div className="rounded-xl bg-white/[0.03] p-3.5">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
            {selectedNode.text}
          </p>
        </div>

        {selectedNode.summary && (
          <div>
            <h4 className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
              Summary
            </h4>
            <p className="text-[12px] text-foreground/70">
              {selectedNode.summary}
            </p>
          </div>
        )}

        {selectedNode.tags.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
              Tags
            </h4>
            <div className="flex flex-wrap gap-1">
              {selectedNode.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70">
          {selectedNode.authorName && (
            <span>By: {selectedNode.authorName}</span>
          )}
          {selectedNode.confidence !== undefined && (
            <span>
              Confidence: {(selectedNode.confidence * 100).toFixed(0)}%
            </span>
          )}
          <span>{formatDate(selectedNode.createdAt)}</span>
        </div>

        {connectedMemories.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
              <Link2 className="h-3 w-3" />
              Connections ({connectedMemories.length})
            </h4>
            <div className="space-y-1.5">
              {connectedMemories.map(({ edge, node: connNode }) => {
                if (!connNode) return null;
                const direction =
                  edge.source === selectedNode.id ? "\u2192" : "\u2190";
                return (
                  <button
                    key={edge.id}
                    onClick={() => onNavigateToNode(connNode.id)}
                    className="w-full rounded-xl border border-border/20 bg-white/[0.02] p-3 text-left transition-all hover:bg-white/[0.05] hover:border-border/40"
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <Badge
                        className={`${linkTypeColorClasses[edge.linkType] ?? ""} border-0`}
                        variant="secondary"
                      >
                        {direction} {edge.linkType.replace(/_/g, " ")}
                      </Badge>
                      <Badge
                        className={`${typeColorClasses[connNode.memoryType] ?? ""} border-0`}
                        variant="secondary"
                      >
                        {connNode.memoryType}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-foreground/60">
                      {connNode.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/20 p-4 space-y-3">
        {onViewFullDetails && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onViewFullDetails}
          >
            View Full Details
          </Button>
        )}
        <p className="text-center text-[10px] text-muted-foreground/40 font-mono">
          {selectedNode.id.slice(0, 8)}...{selectedNode.id.slice(-4)}
        </p>
      </div>
    </div>
  );
}
