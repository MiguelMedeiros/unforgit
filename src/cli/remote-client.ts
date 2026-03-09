import type {
  CreateMemoryInput,
  MemoryLink,
  RecallQuery,
  RecallResult,
} from "../core/types.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

function isTransientError(status: number): boolean {
  return status >= 500 || status === 429;
}

export class RemoteClient {
  private apiKey?: string;
  private timeoutMs: number;

  constructor(
    private baseUrl: string,
    apiKey?: string,
    options?: { timeoutMs?: number },
  ) {
    this.apiKey = apiKey || process.env.UNFORGIT_API_KEY;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
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
        `Configure your API key in .unforgit/unforgit.yaml under remote.apiKey`
      );
    }
    if (res.status === 404 && operation === "resetAll") {
      throw new Error(
        "Remote resetAll failed (404): the configured server does not support " +
        "/v1/memories/reset. Rebuild or restart the remote API so it is running " +
        "a version that includes the reset endpoint."
      );
    }
    throw new Error(`Remote ${operation} failed (${res.status}): ${errorText}`);
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    operation: string,
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await this.fetchWithTimeout(url, init);

        if (res.ok || !isTransientError(res.status)) {
          return res;
        }

        lastError = new Error(
          `Remote ${operation} failed (${res.status}): ${await res.text()}`,
        );
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        const isFatalAbort =
          lastError.message.includes("timed out") && attempt === MAX_RETRIES - 1;
        if (isFatalAbort) throw lastError;
      }

      if (attempt < MAX_RETRIES - 1) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    throw lastError ?? new Error(`Remote ${operation} failed after ${MAX_RETRIES} retries`);
  }

  async store(input: CreateMemoryInput): Promise<{ id: string }> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/memory`,
      { method: "POST", headers: this.getHeaders(), body: JSON.stringify(input) },
      "store",
    );
    if (!res.ok) {
      this.handleError(res, "store", await res.text());
    }
    return res.json() as Promise<{ id: string }>;
  }

  async recall(query: RecallQuery): Promise<{ results: RecallResult[] }> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/recall`,
      { method: "POST", headers: this.getHeaders(), body: JSON.stringify(query) },
      "recall",
    );
    if (!res.ok) {
      this.handleError(res, "recall", await res.text());
    }
    return res.json() as Promise<{ results: RecallResult[] }>;
  }

  async deprecate(id: string, reason?: string): Promise<{ ok: boolean }> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/memory/${id}/deprecate`,
      { method: "POST", headers: this.getHeaders(), body: JSON.stringify({ reason }) },
      "deprecate",
    );
    if (!res.ok) {
      this.handleError(res, "deprecate", await res.text());
    }
    return res.json() as Promise<{ ok: boolean }>;
  }

  async supersede(oldId: string, newId: string): Promise<{ ok: boolean }> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/memory/${oldId}/supersede`,
      { method: "POST", headers: this.getHeaders(), body: JSON.stringify({ newId }) },
      "supersede",
    );
    if (!res.ok) {
      this.handleError(res, "supersede", await res.text());
    }
    return res.json() as Promise<{ ok: boolean }>;
  }

  async link(
    sourceId: string,
    targetId: string,
    linkType: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ link: MemoryLink }> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/memory/${sourceId}/link`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ targetId, linkType, metadata }),
      },
      "link",
    );
    if (!res.ok) {
      this.handleError(res, "link", await res.text());
    }
    return res.json() as Promise<{ link: MemoryLink }>;
  }

  async unlink(
    sourceId: string,
    targetId: string,
    linkType: string,
  ): Promise<{ ok: boolean }> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/memory/${sourceId}/link`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
        body: JSON.stringify({ targetId, linkType }),
      },
      "unlink",
    );
    if (!res.ok) {
      this.handleError(res, "unlink", await res.text());
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

    const res = await this.fetchWithRetry(url, { headers: this.getHeaders() }, "getLinks");
    if (!res.ok) {
      this.handleError(res, "getLinks", await res.text());
    }
    return res.json() as Promise<{ links: MemoryLink[] }>;
  }

  async consolidate(body: Record<string, unknown>): Promise<{
    created: string[];
    superseded: string[];
    processedCount: number;
  }> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/consolidate`,
      { method: "POST", headers: this.getHeaders(), body: JSON.stringify(body) },
      "consolidate",
    );
    if (!res.ok) {
      this.handleError(res, "consolidate", await res.text());
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
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/memory/${id}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
        body: JSON.stringify({ deletedBy, hardDelete }),
      },
      "delete",
    );
    if (!res.ok) {
      this.handleError(res, "delete", await res.text());
    }
    return res.json() as Promise<{ success: boolean; action: string }>;
  }

  async restore(id: string): Promise<{ success: boolean }> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/memory/${id}/restore`,
      { method: "POST", headers: this.getHeaders() },
      "restore",
    );
    if (!res.ok) {
      this.handleError(res, "restore", await res.text());
    }
    return res.json() as Promise<{ success: boolean }>;
  }

  async resetAll(orgId: string, repoId: string): Promise<{
    memoriesDeleted: number;
    linksDeleted: number;
    embeddingsDeleted: number;
  }> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/memories/reset`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ orgId, repoId }),
      },
      "resetAll",
    );
    if (!res.ok) {
      this.handleError(res, "resetAll", await res.text());
    }
    return res.json() as Promise<{
      memoriesDeleted: number;
      linksDeleted: number;
      embeddingsDeleted: number;
    }>;
  }

  async runLifecycle(body: {
    orgId: string;
    repoId: string;
    dryRun?: boolean;
    model?: string;
    preserveOriginals?: boolean;
  }): Promise<{
    dryRun: boolean;
    totalActiveMemories: number;
    expiredCandidates: Array<{
      id: string;
      ttlSeconds: number;
      reason: string;
      textPreview: string;
    }>;
    expiredCount: number;
    strengthenedCandidates: Array<{
      id: string;
      usageCount: number;
      lastUsed?: string;
      recommendedAction: "promote" | "pin";
      reason: string;
      textPreview: string;
    }>;
    consolidationCandidates: Array<{
      reason: string;
      averageScore: number;
      suggestedTags: string[];
      memories: Array<{ id: string; memoryType: string; text: string }>;
    }>;
    executedConsolidations: Array<{
      consolidatedId: string;
      sourceIds: string[];
      generatedText: string;
      suggestedTags: string[];
      memoryType: string;
    }>;
    warnings: string[];
    errors: string[];
  }> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/lifecycle/run`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      },
      "runLifecycle",
    );
    if (!res.ok) {
      this.handleError(res, "runLifecycle", await res.text());
    }
    return res.json() as Promise<{
      dryRun: boolean;
      totalActiveMemories: number;
      expiredCandidates: Array<{
        id: string;
        ttlSeconds: number;
        reason: string;
        textPreview: string;
      }>;
      expiredCount: number;
      strengthenedCandidates: Array<{
        id: string;
        usageCount: number;
        lastUsed?: string;
        recommendedAction: "promote" | "pin";
        reason: string;
        textPreview: string;
      }>;
      consolidationCandidates: Array<{
        reason: string;
        averageScore: number;
        suggestedTags: string[];
        memories: Array<{ id: string; memoryType: string; text: string }>;
      }>;
      executedConsolidations: Array<{
        consolidatedId: string;
        sourceIds: string[];
        generatedText: string;
        suggestedTags: string[];
        memoryType: string;
      }>;
      warnings: string[];
      errors: string[];
    }>;
  }

  async createApiKey(name: string, orgId: string): Promise<{
    id: string;
    key: string;
    name: string;
    orgId: string;
  }> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/api-keys`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ name, orgId }),
      },
      "createApiKey",
    );
    if (!res.ok) {
      this.handleError(res, "createApiKey", await res.text());
    }
    return res.json() as Promise<{ id: string; key: string; name: string; orgId: string }>;
  }

  async listApiKeys(orgId?: string): Promise<{
    keys: Array<{
      id: string;
      name: string;
      orgId: string;
      isActive: boolean;
      createdAt: string;
      lastUsedAt: string | null;
    }>;
  }> {
    const params = new URLSearchParams();
    if (orgId) params.set("orgId", orgId);
    const qs = params.toString();
    const url = `${this.baseUrl}/v1/api-keys${qs ? `?${qs}` : ""}`;

    const res = await this.fetchWithRetry(url, { headers: this.getHeaders() }, "listApiKeys");
    if (!res.ok) {
      this.handleError(res, "listApiKeys", await res.text());
    }
    return res.json() as Promise<{
      keys: Array<{
        id: string;
        name: string;
        orgId: string;
        isActive: boolean;
        createdAt: string;
        lastUsedAt: string | null;
      }>;
    }>;
  }

  async revokeApiKey(id: string): Promise<void> {
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/v1/api-keys/${id}`,
      { method: "DELETE", headers: this.getHeaders() },
      "revokeApiKey",
    );
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`API key '${id}' not found.`);
      }
      this.handleError(res, "revokeApiKey", await res.text());
    }
  }
}
