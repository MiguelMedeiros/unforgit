"use client";

import { MemoryGraph } from "@/components/memory-graph";

export default function GraphPage() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <MemoryGraph />
    </div>
  );
}
