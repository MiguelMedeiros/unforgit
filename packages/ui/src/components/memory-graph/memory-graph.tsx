"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  type MutableRefObject,
} from "react";
import dynamic from "next/dynamic";
import { Link2 } from "lucide-react";
import { useContainerSize } from "../../hooks/use-container-size";
import { truncateText } from "../../utils/format";
import {
  TYPE_COLORS,
  LINK_TYPE_COLORS,
  NODE_TYPES,
  LINK_TYPES,
  STATUSES,
} from "../../constants/memory-types";
import { GraphControls } from "./graph-controls";
import { GraphFilters } from "./graph-filters";
import { GraphStats } from "./graph-stats";
import { GraphDetailPanel } from "./graph-detail-panel";
import type {
  MemoryNode,
  MemoryEdge,
  GraphNode,
  GraphLink,
  MemoryGraphProps,
} from "./types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export function MemoryGraph({
  fetchData,
  showSourceToggle = false,
  collapsibleFilters = false,
  defaultFiltersCollapsed = false,
  onMemoryClick,
  onMemoryDoubleClick,
  renderStatsExtra,
  source: externalSource,
  onSourceChange,
}: MemoryGraphProps) {
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [edges, setEdges] = useState<MemoryEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [showOrphans, setShowOrphans] = useState(true);
  const [internalSource, setInternalSource] = useState<"local" | "remote">(
    "local"
  );

  const source = externalSource ?? internalSource;
  const handleSourceChange = onSourceChange ?? setInternalSource;

  const [visibleNodeTypes, setVisibleNodeTypes] = useState<Set<string>>(
    new Set(NODE_TYPES)
  );
  const [visibleLinkTypes, setVisibleLinkTypes] = useState<Set<string>>(
    new Set(LINK_TYPES)
  );
  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(
    new Set(STATUSES)
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  const {
    size: { width: canvasWidth, height: canvasHeight },
    callbackRef: canvasRef,
  } = useContainerSize();
  const initialFitDone = useRef(false);

  const loadGraphData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData();

      const linkCountMap = new Map<string, number>();
      const links = data.links ?? [];
      for (const link of links) {
        linkCountMap.set(
          link.sourceId,
          (linkCountMap.get(link.sourceId) ?? 0) + 1
        );
        linkCountMap.set(
          link.targetId,
          (linkCountMap.get(link.targetId) ?? 0) + 1
        );
      }

      const memories = data.memories ?? [];
      const memNodes: MemoryNode[] = memories.map((m) => ({
        id: m.id,
        memoryType: m.memoryType,
        text: m.text,
        summary: m.summary,
        tags: m.tags ?? [],
        status: m.status,
        confidence: m.confidence,
        authorId: m.authorId,
        authorName: m.authorName,
        createdAt: m.createdAt,
        linkCount: linkCountMap.get(m.id) ?? 0,
      }));

      const memEdges: MemoryEdge[] = links.map((l) => ({
        id: l.id,
        source: l.sourceId,
        target: l.targetId,
        linkType: l.linkType,
      }));

      setNodes(memNodes);
      setEdges(memEdges);
      initialFitDone.current = false;
    } catch (err) {
      console.error("Failed to load graph:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  const graphData = useMemo(() => {
    const typeFilteredNodes = nodes.filter(
      (n) =>
        visibleNodeTypes.has(n.memoryType) && visibleStatuses.has(n.status)
    );
    const typeFilteredNodeIds = new Set(typeFilteredNodes.map((n) => n.id));

    const filteredEdges = edges.filter(
      (e) =>
        visibleLinkTypes.has(e.linkType) &&
        typeFilteredNodeIds.has(e.source) &&
        typeFilteredNodeIds.has(e.target)
    );

    const linkedIds = new Set<string>();
    for (const e of filteredEdges) {
      linkedIds.add(e.source);
      linkedIds.add(e.target);
    }

    const filteredNodes = showOrphans
      ? typeFilteredNodes
      : typeFilteredNodes.filter((n) => linkedIds.has(n.id));

    return {
      nodes: filteredNodes.map((n) => ({ ...n })),
      links: filteredEdges.map((e) => ({ ...e })),
    };
  }, [
    nodes,
    edges,
    showOrphans,
    visibleNodeTypes,
    visibleLinkTypes,
    visibleStatuses,
  ]);

  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }, [edges]);

  const selectedNeighbors = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return neighborMap.get(selectedNode.id) ?? new Set<string>();
  }, [selectedNode, neighborMap]);

  const selectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return edges.filter(
      (e) => e.source === selectedNode.id || e.target === selectedNode.id
    );
  }, [selectedNode, edges]);

  const connectedMemories = useMemo(() => {
    if (!selectedNode) return [];
    return selectedEdges.map((e) => {
      const otherId = e.source === selectedNode.id ? e.target : e.source;
      const node = nodes.find((n) => n.id === otherId);
      return { edge: e, node };
    });
  }, [selectedNode, selectedEdges, nodes]);

  const handleEngineStop = useCallback(() => {
    if (!initialFitDone.current && graphRef.current) {
      initialFitDone.current = true;
      graphRef.current.zoomToFit(400, 60);
    }
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const handleNodeDoubleClick = useCallback(
    (node: GraphNode) => {
      if (onMemoryDoubleClick) {
        onMemoryDoubleClick(node);
      } else if (onMemoryClick) {
        onMemoryClick(node);
      }
    },
    [onMemoryClick, onMemoryDoubleClick]
  );

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleZoomIn = useCallback(() => {
    const fg = graphRef.current;
    if (fg) fg.zoom(fg.zoom() * 1.5, 300);
  }, []);

  const handleZoomOut = useCallback(() => {
    const fg = graphRef.current;
    if (fg) fg.zoom(fg.zoom() / 1.5, 300);
  }, []);

  const handleFitView = useCallback(() => {
    const fg = graphRef.current;
    if (fg) fg.zoomToFit(400, 60);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedNode(null);
    const fg = graphRef.current;
    if (fg) fg.zoomToFit(400, 60);
  }, []);

  const toggleNodeType = useCallback((type: string) => {
    setVisibleNodeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const toggleLinkType = useCallback((type: string) => {
    setVisibleLinkTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const toggleStatus = useCallback((status: string) => {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        if (next.size > 1) next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const navigateToNode = useCallback(
    (nodeId: string) => {
      const node = graphData.nodes.find((n) => n.id === nodeId) as
        | GraphNode
        | undefined;
      if (node && graphRef.current) {
        setSelectedNode(node);
        graphRef.current.centerAt(node.x, node.y, 500);
        graphRef.current.zoom(3, 500);
      }
    },
    [graphData.nodes]
  );

  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isSelected = selectedNode?.id === node.id;
      const isNeighbor = selectedNeighbors.has(node.id);
      const isDimmed = selectedNode && !isSelected && !isNeighbor;
      const isHovered = hoveredNode?.id === node.id;

      const baseRadius = 4 + Math.min(node.linkCount * 1.5, 12);
      const radius = isSelected ? baseRadius + 3 : baseRadius;

      const color = TYPE_COLORS[node.memoryType] ?? "#888";
      const alpha = isDimmed ? 0.12 : 1;

      if (!isDimmed && (isSelected || isHovered)) {
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, radius + 6, 0, 2 * Math.PI);
        ctx.fillStyle = color + "15";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = alpha < 1 ? color + "1f" : color;
      ctx.fill();

      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? "#fff" : color;
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.stroke();
      }

      if (node.status === "deprecated") {
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fill();
      }

      if (globalScale > 1.2 && !isDimmed) {
        const label = truncateText(node.summary || node.text, 30);
        const fontSize = Math.max(10 / globalScale, 2.5);
        ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = isDimmed
          ? "rgba(150,150,150,0.3)"
          : "rgba(245,245,247,0.75)";
        ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + radius + 3);
      }

      node.__bckgDimensions = [radius * 2, radius * 2];
    },
    [selectedNode, selectedNeighbors, hoveredNode]
  );

  const linkCanvasObject = useCallback(
    (link: GraphLink, ctx: CanvasRenderingContext2D, _globalScale: number) => {
      const sourceNode = link.source as GraphNode;
      const targetNode = link.target as GraphNode;
      if (
        !sourceNode ||
        !targetNode ||
        sourceNode.x == null ||
        targetNode.x == null
      )
        return;

      const sourceId =
        typeof link.source === "string"
          ? link.source
          : (link.source as GraphNode).id;
      const targetId =
        typeof link.target === "string"
          ? link.target
          : (link.target as GraphNode).id;

      const isHighlighted =
        selectedNode &&
        (sourceId === selectedNode.id || targetId === selectedNode.id);

      const isDimmed = selectedNode && !isHighlighted;
      const color = LINK_TYPE_COLORS[link.linkType] ?? "#666";

      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y!);
      ctx.lineTo(targetNode.x, targetNode.y!);
      ctx.strokeStyle = isDimmed
        ? "rgba(150,150,150,0.04)"
        : isHighlighted
          ? color
          : color + "35";
      ctx.lineWidth = isHighlighted ? 2 : 0.6;
      ctx.stroke();

      if (isHighlighted) {
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y! - sourceNode.y!;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;

        const targetRadius =
          4 +
          Math.min(
            (nodes.find((n) => n.id === targetId)?.linkCount ?? 0) * 1.5,
            12
          );
        const arrowLen = 6;
        const endX = targetNode.x - (dx / len) * (targetRadius + 2);
        const endY = targetNode.y! - (dy / len) * (targetRadius + 2);
        const angle = Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLen * Math.cos(angle - Math.PI / 7),
          endY - arrowLen * Math.sin(angle - Math.PI / 7)
        );
        ctx.lineTo(
          endX - arrowLen * Math.cos(angle + Math.PI / 7),
          endY - arrowLen * Math.sin(angle + Math.PI / 7)
        );
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    },
    [selectedNode, nodes]
  );

  const nodePointerAreaPaint = useCallback(
    (node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
      const radius = 4 + Math.min(node.linkCount * 1.5, 12) + 4;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    []
  );

  const filteredStats = useMemo(() => {
    const linkedIds = new Set<string>();
    for (const link of graphData.links) {
      const sourceId =
        typeof link.source === "string"
          ? link.source
          : (link.source as GraphNode).id;
      const targetId =
        typeof link.target === "string"
          ? link.target
          : (link.target as GraphNode).id;
      linkedIds.add(sourceId);
      linkedIds.add(targetId);
    }
    const linkedCount = linkedIds.size;
    const orphanCount = graphData.nodes.length - linkedCount;
    return { linkedCount, orphanCount, linkCount: graphData.links.length };
  }, [graphData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <span className="text-[13px] text-muted-foreground">
            Loading graph...
          </span>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.04]">
          <Link2 className="h-8 w-8 text-muted-foreground/30" />
        </div>
        <p className="text-[14px] text-muted-foreground">No memories found</p>
        <p className="text-[12px] text-muted-foreground/50">
          Create memories and link them to see the graph
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
      }}
    >
      <div
        ref={canvasRef}
        style={{ flex: 1, position: "relative", minWidth: 0, minHeight: 0 }}
      >
        {canvasWidth > 0 && canvasHeight > 0 && (
          <ForceGraph2D
            ref={graphRef as MutableRefObject<undefined>}
            width={canvasWidth}
            height={canvasHeight}
            graphData={graphData}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeCanvasObject={nodeCanvasObject as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodePointerAreaPaint={nodePointerAreaPaint as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            linkCanvasObject={linkCanvasObject as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onNodeClick={handleNodeClick as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onNodeRightClick={handleNodeDoubleClick as any}
            onBackgroundClick={handleBackgroundClick}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onNodeHover={(node: any) =>
              setHoveredNode(node as GraphNode | null)
            }
            onEngineStop={handleEngineStop}
            cooldownTicks={120}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            d3AlphaMin={0.001}
            enableNodeDrag={true}
            backgroundColor="transparent"
            dagMode={undefined}
            // @ts-expect-error d3Force is a valid prop but types are incomplete
            d3Force={(name, force) => {
              if (name === "charge" && force) {
                force.strength(-120).distanceMax(250);
              }
              if (name === "center" && force) {
                force.strength(0.1);
              }
              if (name === "link" && force) {
                force.distance(80).strength(0.4);
              }
            }}
          />
        )}

        {/* Controls */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <GraphControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitView={handleFitView}
            onReset={handleReset}
            showOrphans={showOrphans}
            onToggleOrphans={() => setShowOrphans(!showOrphans)}
            showSourceToggle={showSourceToggle}
            source={source}
            onSourceChange={handleSourceChange}
          />

          {collapsibleFilters ? (
            <GraphFilters
              visibleNodeTypes={visibleNodeTypes}
              visibleStatuses={visibleStatuses}
              visibleLinkTypes={visibleLinkTypes}
              onToggleNodeType={toggleNodeType}
              onToggleStatus={toggleStatus}
              onToggleLinkType={toggleLinkType}
              collapsible={true}
              defaultCollapsed={defaultFiltersCollapsed}
            />
          ) : null}
        </div>

        {/* Filters (non-collapsible) */}
        {!collapsibleFilters && (
          <div className="absolute bottom-4 left-4 z-10">
            <GraphFilters
              visibleNodeTypes={visibleNodeTypes}
              visibleStatuses={visibleStatuses}
              visibleLinkTypes={visibleLinkTypes}
              onToggleNodeType={toggleNodeType}
              onToggleStatus={toggleStatus}
              onToggleLinkType={toggleLinkType}
              collapsible={false}
            />
          </div>
        )}

        {/* Stats */}
        <div className="absolute top-4 right-4 z-10">
          <GraphStats
            linkedCount={filteredStats.linkedCount}
            orphanCount={filteredStats.orphanCount}
            linkCount={filteredStats.linkCount}
            showSource={showSourceToggle}
            source={source}
            renderExtra={renderStatsExtra}
          />
        </div>
      </div>

      {/* Detail Panel */}
      {selectedNode && (
        <GraphDetailPanel
          selectedNode={selectedNode}
          connectedMemories={connectedMemories}
          onClose={() => setSelectedNode(null)}
          onNavigateToNode={navigateToNode}
          onViewFullDetails={
            onMemoryClick ? () => onMemoryClick(selectedNode) : undefined
          }
        />
      )}
    </div>
  );
}
