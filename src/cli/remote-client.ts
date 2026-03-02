import type {
  CreateMemoryInput,
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
}
