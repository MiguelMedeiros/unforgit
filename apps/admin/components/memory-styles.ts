export const typeConfig: Record<string, { bg: string; text: string; dot: string }> = {
  episodic: {
    bg: "bg-white/[0.06]",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  semantic: {
    bg: "bg-white/[0.06]",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  procedural: {
    bg: "bg-white/[0.06]",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export const typeConfigDefault = {
  bg: "bg-white/[0.06]",
  text: "text-muted-foreground",
  dot: "bg-muted-foreground",
};

export const statusConfig: Record<string, { dot: string }> = {
  active: { dot: "bg-foreground" },
  deprecated: { dot: "bg-muted-foreground/50" },
  superseded: { dot: "bg-muted-foreground/30" },
};

export const statusConfigDefault = { dot: "bg-muted-foreground" };
