"use client";

import { useState, useCallback } from "react";
import {
  MemoryGraph as BaseMemoryGraph,
  type MemoryNode,
  type GraphData,
} from "@unforgit/ui/components";
import { MemoryDetailSheet } from "@/components/memory-detail-sheet";

export function MemoryGraph() {
  const [source, setSource] = useState<"local" | "remote">("local");
  const [detailMemoryId, setDetailMemoryId] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<GraphData> => {
    const response = await fetch(`/api/graph?source=${source}`);
    if (!response.ok) throw new Error("Failed to fetch graph data");
    return response.json();
  }, [source]);

  const handleMemoryDoubleClick = useCallback((memory: MemoryNode) => {
    setDetailMemoryId(memory.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailMemoryId(null);
  }, []);

  const refetchGraph = useCallback(() => {
    // Trigger re-fetch by changing source slightly
    // The component will re-fetch when fetchData changes
  }, []);

  return (
    <>
      <BaseMemoryGraph
        fetchData={fetchData}
        showSourceToggle={true}
        collapsibleFilters={false}
        source={source}
        onSourceChange={setSource}
        onMemoryDoubleClick={handleMemoryDoubleClick}
        onMemoryClick={handleMemoryDoubleClick}
      />
      <MemoryDetailSheet
        memoryId={detailMemoryId}
        onClose={handleCloseDetail}
        onAction={refetchGraph}
        onNavigate={(id) => {
          setDetailMemoryId(id);
        }}
      />
    </>
  );
}
