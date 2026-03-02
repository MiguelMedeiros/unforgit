import { NextResponse } from "next/server";
import {
  getConfig,
  getDbPath,
  getDbFileSize,
  getWorkspacePath,
  isInitialized,
} from "@/lib/config";

export async function GET() {
  const initialized = isInitialized();
  const config = getConfig();
  const dbPath = getDbPath();
  const dbSize = getDbFileSize();
  const workspace = getWorkspacePath();

  let remoteConnected = false;
  if (config?.remote.url) {
    try {
      const res = await fetch(`${config.remote.url}/health`);
      if (res.ok) remoteConnected = true;
    } catch {
      /* not connected */
    }
  }

  return NextResponse.json({
    initialized,
    workspace,
    config,
    dbPath,
    dbSize,
    remoteConnected,
    hasRemoteUrl: !!process.env.DATABASE_URL,
  });
}
