export interface MemoryDetailInitialState {
  key: string;
  loading: boolean;
  memory: null;
  linkedMemories: [];
}

export function createMemoryDetailState(
  memoryId: string | null,
): MemoryDetailInitialState | null {
  if (!memoryId) return null;

  return {
    key: memoryId,
    loading: true,
    memory: null,
    linkedMemories: [],
  };
}
