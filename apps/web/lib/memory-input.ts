import type { MemoryType, Visibility } from "./types";

const MEMORY_TYPES: readonly MemoryType[] = ["episodic", "semantic", "procedural"];
const VISIBILITIES: readonly Visibility[] = ["private", "repo", "auto"];

export interface ValidMemoryBody {
  memoryType: MemoryType;
  text: string;
  summary?: string;
  tags: string[];
  sourceRefs?: Record<string, unknown>;
  confidence?: number;
  visibility: Visibility;
}

export type MemoryBodyResult =
  | { ok: true; value: ValidMemoryBody }
  | { ok: false; error: string };

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parses a JSON request body; an empty body yields `undefined`, malformed JSON yields `ok: false`. */
export async function readJsonBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  const raw = await request.text();
  if (raw.trim() === "") return { ok: true, body: undefined };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

export function validateCreateMemoryBody(body: unknown): MemoryBodyResult {
  if (!isPlainObject(body)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const { text, memoryType, visibility, summary, tags, confidence, sourceRefs } = body;

  if (typeof text !== "string" || text.trim() === "") {
    return { ok: false, error: "text must be a non-empty string" };
  }

  if (memoryType != null && !MEMORY_TYPES.includes(memoryType as MemoryType)) {
    return { ok: false, error: `memoryType must be one of: ${MEMORY_TYPES.join(", ")}` };
  }

  if (visibility != null && !VISIBILITIES.includes(visibility as Visibility)) {
    return { ok: false, error: `visibility must be one of: ${VISIBILITIES.join(", ")}` };
  }

  if (summary != null && typeof summary !== "string") {
    return { ok: false, error: "summary must be a string" };
  }

  if (tags != null && (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string"))) {
    return { ok: false, error: "tags must be an array of strings" };
  }

  if (
    confidence != null &&
    (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1)
  ) {
    return { ok: false, error: "confidence must be a number between 0 and 1" };
  }

  if (sourceRefs != null && !isPlainObject(sourceRefs)) {
    return { ok: false, error: "sourceRefs must be an object" };
  }

  return {
    ok: true,
    value: {
      text,
      memoryType: (memoryType as MemoryType | null | undefined) ?? "episodic",
      visibility: (visibility as Visibility | null | undefined) ?? "auto",
      summary: (summary as string | null | undefined) ?? undefined,
      tags: (tags as string[] | null | undefined) ?? [],
      confidence: (confidence as number | null | undefined) ?? undefined,
      sourceRefs: (sourceRefs as Record<string, unknown> | null | undefined) ?? undefined,
    },
  };
}
