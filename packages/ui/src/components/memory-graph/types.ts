export interface MemoryNode {
  id: string;
  memoryType: string;
  text: string;
  summary?: string;
  tags: string[];
  status: string;
  confidence?: number;
  authorId?: string;
  authorName?: string;
  createdAt: string;
  linkCount: number;
}

export interface MemoryEdge {
  id: string;
  source: string;
  target: string;
  linkType: string;
}

export interface GraphNode extends MemoryNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  __bckgDimensions?: [number, number];
}

export interface GraphLink {
  id: string;
  source: GraphNode | string;
  target: GraphNode | string;
  linkType: string;
}

export interface GraphData {
  memories: Array<{
    id: string;
    memoryType: string;
    text: string;
    summary?: string;
    tags?: string[];
    status: string;
    confidence?: number;
    authorId?: string;
    authorName?: string;
    createdAt: string;
  }>;
  links: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    linkType: string;
  }>;
}

export interface MemoryGraphProps {
  fetchData: () => Promise<GraphData>;
  showSourceToggle?: boolean;
  collapsibleFilters?: boolean;
  defaultFiltersCollapsed?: boolean;
  onMemoryClick?: (memory: MemoryNode) => void;
  onMemoryDoubleClick?: (memory: MemoryNode) => void;
  renderStatsExtra?: () => React.ReactNode;
  source?: "local" | "remote";
  onSourceChange?: (source: "local" | "remote") => void;
}
