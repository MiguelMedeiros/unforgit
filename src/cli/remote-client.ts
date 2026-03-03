import type {
  CreateMemoryInput,
  MemoryLink,
  RecallQuery,
  RecallResult,
} from "../core/types.js";

export class RemoteClient {
  constructor(private baseUrl: string) {}

  async store(input: CreateMemoryInput): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/v1/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Remote store failed (${res.status}): ${err}`);
    }
    return res.json() as Promise<{ id: string }>;
  }

  async recall(
    query: RecallQuery,
  ): Promise<{ results: RecallResult[] }> {
    const res = await fetch(`${this.baseUrl}/v1/recall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Remote recall failed (${res.status}): ${err}`);
    }
    return res.json() as Promise<{ results: RecallResult[] }>;
  }

  async deprecate(
    id: string,
    reason?: string,
  ): Promise<{ ok: boolean }> {
    const res = await fetch(`${this.baseUrl}/v1/memory/${id}/deprecate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Remote deprecate failed (${res.status}): ${err}`);
    }
    return res.json() as Promise<{ ok: boolean }>;
  }

  async supersede(
    oldId: string,
    newId: string,
  ): Promise<{ ok: boolean }> {
    const res = await fetch(`${this.baseUrl}/v1/memory/${oldId}/supersede`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newId }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Remote supersede failed (${res.status}): ${err}`);
    }
    return res.json() as Promise<{ ok: boolean }>;
  }

  async link(
    sourceId: string,
    targetId: string,
    linkType: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ link: MemoryLink }> {
    const res = await fetch(`${this.baseUrl}/v1/memory/${sourceId}/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, linkType, metadata }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Remote link failed (${res.status}): ${err}`);
    }
    return res.json() as Promise<{ link: MemoryLink }>;
  }

  async unlink(
    sourceId: string,
    targetId: string,
    linkType: string,
  ): Promise<{ ok: boolean }> {
    const res = await fetch(`${this.baseUrl}/v1/memory/${sourceId}/link`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, linkType }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Remote unlink failed (${res.status}): ${err}`);
    }
    return res.json() as Promise<{ ok: boolean }>;
  }

  async getLinks(
    memoryId: string,
    linkType?: string,
  ): Promise<{ links: MemoryLink[] }> {
    const params = new URLSearchParams();
    if (linkType) params.set("linkType", linkType);
    const qs = params.toString();
    const url = `${this.baseUrl}/v1/memory/${memoryId}/links${qs ? `?${qs}` : ""}`;

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Remote getLinks failed (${res.status}): ${err}`);
    }
    return res.json() as Promise<{ links: MemoryLink[] }>;
  }

  async consolidate(body: Record<string, unknown>): Promise<{
    created: string[];
    superseded: string[];
    processedCount: number;
  }> {
    const res = await fetch(`${this.baseUrl}/v1/consolidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Remote consolidate failed (${res.status}): ${err}`);
    }
    return res.json() as Promise<{
      created: string[];
      superseded: string[];
      processedCount: number;
    }>;
  }

  async delete(
    id: string,
    deletedBy?: string,
    hardDelete?: boolean,
  ): Promise<{ success: boolean; action: string }> {
    const res = await fetch(`${this.baseUrl}/v1/memory/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deletedBy, hardDelete }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Remote delete failed (${res.status}): ${err}`);
    }
    return res.json() as Promise<{ success: boolean; action: string }>;
  }

  async restore(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${this.baseUrl}/v1/memory/${id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Remote restore failed (${res.status}): ${err}`);
    }
    return res.json() as Promise<{ success: boolean }>;
  }
}
