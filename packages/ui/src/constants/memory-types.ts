export const TYPE_COLORS: Record<string, string> = {
  episodic: "#fafafa",
  semantic: "#a1a1aa",
  procedural: "#52525b",
};

export const LINK_TYPE_COLORS: Record<string, string> = {
  related_to: "#d4d4d8",
  derived_from: "#a1a1aa",
  contradicts: "#fafafa",
  depends_on: "#71717a",
};

export const TYPE_LABELS: Record<string, string> = {
  related_to: "Related to",
  derived_from: "Derived from",
  contradicts: "Contradicts",
  depends_on: "Depends on",
};

export const STATUS_COLORS: Record<string, string> = {
  active: "#fafafa",
  superseded: "#a1a1aa",
  deprecated: "#71717a",
  deleted: "#3f3f46",
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  superseded: "Superseded",
  deprecated: "Deprecated",
  deleted: "Deleted",
};

export const typeColorClasses: Record<string, string> = {
  episodic: "bg-white/[0.08] text-foreground",
  semantic: "bg-white/[0.06] text-muted-foreground",
  procedural: "bg-white/[0.04] text-muted-foreground/80",
};

export const linkTypeColorClasses: Record<string, string> = {
  related_to: "bg-white/[0.08] text-foreground",
  derived_from: "bg-white/[0.06] text-muted-foreground",
  contradicts: "bg-white/[0.08] text-foreground",
  depends_on: "bg-white/[0.04] text-muted-foreground/80",
};

export const NODE_TYPES = ["episodic", "semantic", "procedural"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const LINK_TYPES = [
  "related_to",
  "derived_from",
  "contradicts",
  "depends_on",
] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const STATUSES = ["active", "superseded", "deprecated", "deleted"] as const;
export type Status = (typeof STATUSES)[number];
