import OpenAI from "openai";
import type { Memory, MemoryType } from "@unforgit/shared";

export interface ConsolidationInput {
  memories: Array<{
    text: string;
    type: MemoryType;
    tags: string[];
  }>;
}

export interface ConsolidationOutput {
  text: string;
  suggestedTags: string[];
  suggestedType: MemoryType;
}

const CONSOLIDATION_PROMPT = `You are consolidating multiple related memories into a single unified memory.

Source memories:
{{MEMORIES}}

Instructions:
1. Identify the core knowledge/insight shared across these memories
2. Merge complementary information without losing important details
3. Remove redundancy while preserving unique facts
4. Keep the consolidated text concise (ideally under 200 words)
5. Maintain technical accuracy
6. Write in the same language as the source memories

Output format (JSON):
{
  "text": "The consolidated memory text",
  "suggestedTags": ["tag1", "tag2"],
  "suggestedType": "semantic" | "procedural" | "episodic"
}

Output only valid JSON, nothing else.`;

function formatMemoriesForPrompt(
  memories: ConsolidationInput["memories"],
): string {
  return memories
    .map(
      (m, i) =>
        `${i + 1}. [${m.type}] ${m.text}\n   Tags: ${m.tags.length > 0 ? m.tags.join(", ") : "none"}`,
    )
    .join("\n\n");
}

function inferMemoryType(memories: ConsolidationInput["memories"]): MemoryType {
  const hasProcedural = memories.some((m) => m.type === "procedural");
  const hasSemantic = memories.some((m) => m.type === "semantic");

  if (hasProcedural) return "procedural";
  if (hasSemantic) return "semantic";
  return "episodic";
}

function mergeTags(memories: ConsolidationInput["memories"]): string[] {
  const tagSet = new Set<string>();
  for (const m of memories) {
    for (const tag of m.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet);
}

export async function generateConsolidatedText(
  input: ConsolidationInput,
  options?: {
    apiKey?: string;
    model?: string;
  },
): Promise<ConsolidationOutput> {
  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Set OPENAI_API_KEY environment variable.",
    );
  }

  const client = new OpenAI({ apiKey });
  const model = options?.model ?? "gpt-4o-mini";

  const memoriesText = formatMemoriesForPrompt(input.memories);
  const prompt = CONSOLIDATION_PROMPT.replace("{{MEMORIES}}", memoriesText);

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  try {
    const parsed = JSON.parse(content) as {
      text?: string;
      suggestedTags?: string[];
      suggestedType?: string;
    };

    if (!parsed.text || typeof parsed.text !== "string") {
      throw new Error("Invalid response: missing text field");
    }

    const validTypes: MemoryType[] = ["episodic", "semantic", "procedural"];
    const suggestedType =
      parsed.suggestedType && validTypes.includes(parsed.suggestedType as MemoryType)
        ? (parsed.suggestedType as MemoryType)
        : inferMemoryType(input.memories);

    return {
      text: parsed.text,
      suggestedTags: Array.isArray(parsed.suggestedTags)
        ? parsed.suggestedTags.filter((t): t is string => typeof t === "string")
        : mergeTags(input.memories),
      suggestedType,
    };
  } catch (parseError) {
    const textMatch = content.match(/"text"\s*:\s*"([^"]+)"/);
    if (textMatch) {
      return {
        text: textMatch[1],
        suggestedTags: mergeTags(input.memories),
        suggestedType: inferMemoryType(input.memories),
      };
    }

    return {
      text: content.trim(),
      suggestedTags: mergeTags(input.memories),
      suggestedType: inferMemoryType(input.memories),
    };
  }
}

export function memoriesToConsolidationInput(
  memories: Memory[],
): ConsolidationInput {
  return {
    memories: memories.map((m) => ({
      text: m.text,
      type: m.memoryType,
      tags: m.tags,
    })),
  };
}
