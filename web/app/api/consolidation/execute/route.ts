import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";
import OpenAI from "openai";

interface ConsolidationInput {
  memories: Array<{
    id: string;
    text: string;
    memoryType: string;
    tags: string[];
  }>;
}

async function generateConsolidatedText(
  input: ConsolidationInput,
  apiKey: string,
  model: string = "gpt-4o-mini",
): Promise<{ text: string; suggestedTags: string[]; suggestedType: string }> {
  const client = new OpenAI({ apiKey });

  const memoriesText = input.memories
    .map(
      (m, i) =>
        `${i + 1}. [${m.memoryType}] ${m.text}\n   Tags: ${m.tags.length > 0 ? m.tags.join(", ") : "none"}`,
    )
    .join("\n\n");

  const prompt = `You are consolidating multiple related memories into a single unified memory.

Source memories:
${memoriesText}

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

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  try {
    const parsed = JSON.parse(content);
    return {
      text: parsed.text,
      suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
      suggestedType: parsed.suggestedType || "semantic",
    };
  } catch {
    return {
      text: content.trim(),
      suggestedTags: [],
      suggestedType: "semantic",
    };
  }
}

export async function POST(request: NextRequest) {
  const config = getConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Unforgit not initialized" },
      { status: 500 },
    );
  }

  const store = getLocalStore();
  if (!store) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const { sourceIds, model = "gpt-4o-mini" } = body;

  if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length < 2) {
    return NextResponse.json(
      { error: "At least 2 sourceIds are required" },
      { status: 400 },
    );
  }

  const memories = sourceIds
    .map((id: string) => store.getById(id))
    .filter((m): m is NonNullable<typeof m> => m !== undefined);

  if (memories.length !== sourceIds.length) {
    return NextResponse.json(
      { error: "Some memories not found" },
      { status: 404 },
    );
  }

  try {
    const llmResult = await generateConsolidatedText(
      {
        memories: memories.map((m) => ({
          id: m.id,
          text: m.text,
          memoryType: m.memoryType,
          tags: m.tags,
        })),
      },
      apiKey,
      model,
    );

    const result = store.consolidateMemories({
      orgId: config.remote.orgId,
      repoId: config.remote.repoId,
      sourceIds,
      consolidatedText: llmResult.text,
      memoryType: llmResult.suggestedType,
      tags: llmResult.suggestedTags,
      preserveOriginals: true,
    });

    return NextResponse.json({
      success: true,
      consolidatedId: result.consolidatedId,
      generatedText: llmResult.text,
      suggestedTags: llmResult.suggestedTags,
      memoryType: llmResult.suggestedType,
      sourcesConsolidated: sourceIds.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Consolidation failed" },
      { status: 500 },
    );
  }
}
