import type {
  CreateMemoryInput,
  MemoryLink,
  RecallQuery,
  RecallResult,
} from "../core/types.js";

export class RemoteClient {
  private apiKey?: string;

  constructor(private baseUrl: string, apiKey?: string) {
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private handleError(res: Response, operation: string, errorText: string): never {
    if (res.status === 401) {
      throw new Error(
        `Authentication failed for ${operation}: Invalid or missing API key. ` +
        `Configure your API key in .hippocampus/hippo.yaml under remote.apiKey`
      );
    }
    throw new Error(`Remote ${operation} failed (${res.status}): ${errorText}`);
  }

  async store(input: CreateMemoryInput): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/v1/memory`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.text();
      this.handleError(res, "store", err);
    }
    return res.json() as Promise<{ id: string }>;
  }

  async recall(
    query: RecallQuery,
  ): Promise<{ results: RecallResult[] }> {
    const res = await fetch(`${this.baseUrl}/v1/recall`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(query),
    });
    if (!res.ok) {
      const err = await res.text();
      this.handleError(res, "recall", err);
    }
    return res.json() as Promise<{ results: RecallResult[] }>;
  }

  async deprecate(
    id: string,
    reason?: string,
  ): Promise<{ ok: boolean }> {
    const res = await fetch(`${this.baseUrl}/v1/memory/${id}/deprecate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.text();
      this.handleError(res, "deprecate", err);
    }
    return res.json() as Promise<{ ok: boolean }>;
  }

  async supersede(
    oldId: string,
    newId: string,
  ): Promise<{ ok: boolean }> {
    const res = await fetch(`${this.baseUrl}/v1/memory/${oldId}/supersede`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ newId }),
    });
    if (!res.ok) {
      const err = await res.text();
      this.handleError(res, "supersede", err);
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
      headers: this.getHeaders(),
      body: JSON.stringify({ targetId, linkType, metadata }),
    });
    if (!res.ok) {
      const err = await res.text();
      this.handleError(res, "link", err);
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
      headers: this.getHeaders(),
      body: JSON.stringify({ targetId, linkType }),
    });
    if (!res.ok) {
      const err = await res.text();
      this.handleError(res, "unlink", err);
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

    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      const err = await res.text();
      this.handleError(res, "getLinks", err);
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
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      this.handleError(res, "consolidate", err);
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
      headers: this.getHeaders(),
      body: JSON.stringify({ deletedBy, hardDelete }),
    });
    if (!res.ok) {
      const err = await res.text();
      this.handleError(res, "delete", err);
    }
    return res.json() as Promise<{ success: boolean; action: string }>;
  }

  async restore(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${this.baseUrl}/v1/memory/${id}/restore`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.text();
      this.handleError(res, "restore", err);
    }
    return res.json() as Promise<{ success: boolean }>;
  }
}
