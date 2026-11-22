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

/**
 * Legacy unforgit.yaml files may still hold secrets the CLI now ignores
 * (`openaiApiKey`, `remote.apiKey`). Never echo them back to the browser.
 */
function redactLegacySecrets<T>(config: T): T {
  if (!config || typeof config !== "object") return config;
  const { openaiApiKey: _openaiApiKey, ...rest } = config as Record<string, unknown>;
  const remote = rest.remote;
  if (remote && typeof remote === "object") {
    const { apiKey: _apiKey, ...cleanRemote } = remote as Record<string, unknown>;
    rest.remote = cleanRemote;
  }
  return rest as T;
}

export async function GET() {
  const initialized = isInitialized();
  const config = redactLegacySecrets(getConfig());
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
