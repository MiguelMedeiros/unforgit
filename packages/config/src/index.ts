export {
  detectGitInfo,
  getDataDir,
  getDbPath,
  getConfigPath,
  isInitialized,
  loadConfig,
  saveConfig,
  defaultConfig,
} from "./config.js";

export {
  appConfigSchema,
  syncConfigSchema,
  embeddingConfigSchema,
  lifecycleTtlConfigSchema,
  lifecycleUsageBoostSchema,
  lifecycleMaintenanceSchema,
  lifecycleConfigSchema,
  validateMemoryType,
  parseConfidence,
  parseThreshold,
  parseTtl,
  parsePositiveInt,
} from "./config-schemas.js";

export { RemoteClient } from "./remote-client.js";
