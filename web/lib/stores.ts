import { WebLocalStore } from "./local-store";
import { getDbPath, loadConfig } from "./config";

let _localStore: WebLocalStore | null = null;

export function getLocalStore(): WebLocalStore | null {
  if (_localStore) return _localStore;

  const dbPath = getDbPath();
  try {
    _localStore = new WebLocalStore(dbPath);
    return _localStore;
  } catch {
    return null;
  }
}

export function getConfig() {
  return loadConfig();
}
