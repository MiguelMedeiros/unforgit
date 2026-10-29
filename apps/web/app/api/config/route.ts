import { NextResponse } from "next/server";
import {
  getConfig,
  getDbPath,
  getDbFileSize,
  getWorkspacePath,
  isInitialized,
} from "@/lib/config";

// Bound external probes so a stalled remote/OpenAI endpoint cannot hang the dashboard.
const PROBE_TIMEOUT_MS = 3000;

async function getOpenAIStatus(
  apiKey: string | undefined,
): Promise<"not_configured" | "valid" | "invalid"> {
  if (!apiKey) return "not_configured";

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.ok ? "valid" : "invalid";
  } catch {
    return "invalid";
  }
}

export async function GET() {
  const initialized = isInitialized();
  const config = getConfig();
  const dbPath = getDbPath();
  const dbSize = getDbFileSize();
  const workspace = getWorkspacePath();

  let remoteConnected = false;
  if (config?.remote.url) {
    try {
      const res = await fetch(`${config.remote.url}/health`, {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      if (res.ok) remoteConnected = true;
    } catch {
      /* not connected */
    }
  }

  const openaiStatus = await getOpenAIStatus(process.env.OPENAI_API_KEY);

  return NextResponse.json({
    initialized,
    workspace,
    config,
    dbPath,
    dbSize,
    remoteConnected,
    hasRemoteUrl: !!process.env.DATABASE_URL,
    openaiStatus,
  });
}
