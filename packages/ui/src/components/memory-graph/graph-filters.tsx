"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import {
  TYPE_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  LINK_TYPE_COLORS,
  TYPE_LABELS,
} from "../../constants/memory-types";

interface GraphFiltersProps {
  visibleNodeTypes: Set<string>;
  visibleStatuses: Set<string>;
  visibleLinkTypes: Set<string>;
  onToggleNodeType: (type: string) => void;
  onToggleStatus: (status: string) => void;
  onToggleLinkType: (type: string) => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function GraphFilters({
  visibleNodeTypes,
  visibleStatuses,
  visibleLinkTypes,
  onToggleNodeType,
  onToggleStatus,
  onToggleLinkType,
  collapsible = false,
  defaultCollapsed = false,
}: GraphFiltersProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const filterContent = (
    <>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        Nodes
      </p>
      <div className="flex flex-wrap gap-x-2 gap-y-1.5 mb-3">
        {Object.entries(TYPE_COLORS).map(([type, color]) => {
          const isActive = visibleNodeTypes.has(type);
          return (
            <button
              key={type}
              onClick={() => onToggleNodeType(type)}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition-all ${
                isActive
                  ? "bg-white/[0.08] hover:bg-white/[0.12]"
                  : "opacity-40 hover:opacity-70"
              }`}
              title={isActive ? `Hide ${type} nodes` : `Show ${type} nodes`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full transition-all ${
                  isActive ? "ring-2 ring-offset-1 ring-offset-transparent" : ""
                }`}
                style={{
                  backgroundColor: isActive ? color : "transparent",
                  borderColor: color,
                  borderWidth: 2,
                  borderStyle: "solid",
                }}
              />
              <span
                className={`text-[11px] capitalize ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {type}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        Status
      </p>
      <div className="flex flex-wrap gap-x-2 gap-y-1.5 mb-3">
        {Object.entries(STATUS_COLORS).map(([status, color]) => {
          const isActive = visibleStatuses.has(status);
          return (
            <button
              key={status}
              onClick={() => onToggleStatus(status)}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition-all ${
                isActive
                  ? "bg-white/[0.08] hover:bg-white/[0.12]"
                  : "opacity-40 hover:opacity-70"
              }`}
              title={
                isActive
                  ? `Hide ${STATUS_LABELS[status]} memories`
                  : `Show ${STATUS_LABELS[status]} memories`
              }
            >
              <span
                className="inline-block h-2 w-2 rounded-sm transition-all"
                style={{
                  backgroundColor: isActive ? color : "transparent",
                  borderColor: color,
                  borderWidth: 1.5,
                  borderStyle: "solid",
                }}
              />
              <span
                className={`text-[11px] capitalize ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {STATUS_LABELS[status]}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        Links
      </p>
      <div className="flex flex-wrap gap-x-2 gap-y-1.5">
        {Object.entries(LINK_TYPE_COLORS).map(([type, color]) => {
          const isActive = visibleLinkTypes.has(type);
          return (
            <button
              key={type}
              onClick={() => onToggleLinkType(type)}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition-all ${
                isActive
                  ? "bg-white/[0.08] hover:bg-white/[0.12]"
                  : "opacity-40 hover:opacity-70"
              }`}
              title={
                isActive
                  ? `Hide ${TYPE_LABELS[type]} links`
                  : `Show ${TYPE_LABELS[type]} links`
              }
            >
              <span
                className="inline-block h-[3px] w-4 rounded transition-all"
                style={{
                  backgroundColor: isActive ? color : "transparent",
                  borderColor: color,
                  borderWidth: 1,
                  borderStyle: "solid",
                }}
              />
              <span
                className={`text-[11px] ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {TYPE_LABELS[type] ?? type}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );

  if (collapsible) {
    return (
      <div className="rounded-xl border border-border/50 bg-[rgba(28,28,30,0.85)] glass transition-all overflow-hidden">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/[0.05] transition-colors w-full"
          title={isCollapsed ? "Expand filters" : "Collapse filters"}
        >
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground">
            Filters
          </span>
          {isCollapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          )}
        </button>

        {!isCollapsed && (
          <div className="p-3 border-t border-border/20">{filterContent}</div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/30 bg-[rgba(28,28,30,0.85)] glass p-3">
      {filterContent}
    </div>
  );
}
