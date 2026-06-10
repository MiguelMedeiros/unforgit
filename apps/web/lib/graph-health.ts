export interface GraphHealthMemory {
  id: string;
  status?: string;
  isConsolidation?: boolean;
}

export interface GraphHealthLink {
  sourceId: string;
  targetId: string;
  linkType?: string;
}

export interface GraphHealthSummary {
  activeMemories: number;
  activeConsolidations: number;
  supersededMemories: number;
  totalLinks: number;
  validLinks: number;
  orphanActiveMemories: number;
  orphanRatio: number;
  derivedFromLinks: number;
  relatedLinks: number;
}

export function computeGraphHealth(
  memories: GraphHealthMemory[],
  links: GraphHealthLink[],
): GraphHealthSummary {
  const memoryIds = new Set(memories.map((memory) => memory.id));
  const activeIds = new Set(
    memories
      .filter((memory) => memory.status === "active")
      .map((memory) => memory.id),
  );
  const connectedActiveIds = new Set<string>();
  const validLinks = links.filter(
    (link) => memoryIds.has(link.sourceId) && memoryIds.has(link.targetId),
  );

  for (const link of validLinks) {
    if (activeIds.has(link.sourceId)) connectedActiveIds.add(link.sourceId);
    if (activeIds.has(link.targetId)) connectedActiveIds.add(link.targetId);
  }

  const activeMemories = activeIds.size;
  const orphanActiveMemories = Math.max(activeMemories - connectedActiveIds.size, 0);

  return {
    activeMemories,
    activeConsolidations: memories.filter(
      (memory) => memory.status === "active" && memory.isConsolidation,
    ).length,
    supersededMemories: memories.filter((memory) => memory.status === "superseded").length,
    totalLinks: links.length,
    validLinks: validLinks.length,
    orphanActiveMemories,
    orphanRatio: activeMemories === 0
      ? 0
      : Math.round((orphanActiveMemories / activeMemories) * 100) / 100,
    derivedFromLinks: validLinks.filter((link) => link.linkType === "derived_from").length,
    relatedLinks: validLinks.filter((link) => link.linkType === "related_to").length,
  };
}
