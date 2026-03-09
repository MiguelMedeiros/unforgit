export {
  resolveLifecycleConfig,
  getDefaultTtlSeconds,
  applyLifecycleDefaults,
  isExpiredTtl,
  isMemoryExpired,
  computeUsageBoost,
  type ResolvedLifecycleConfig,
} from "./lifecycle.js";

export {
  LifecycleScheduler,
  type LifecycleSchedulerOptions,
} from "./lifecycle-scheduler.js";

export {
  rankResults,
  computeCompositeScore,
  computeHybridScore,
  normalizeEmbeddingScore,
  deduplicateResults,
  mergeAndRank,
} from "./recall.js";

export { resolveVisibility } from "./policy.js";

export {
  isOpenAIConfigured,
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  serializeEmbedding,
  deserializeEmbedding,
  embeddingToBase64,
  base64ToEmbedding,
  embeddingToPgVector,
  pgVectorToEmbedding,
  findTopKSimilar,
  EMBEDDING_DIMENSIONS_MAP,
  getEmbeddingDimensions,
  isEmbeddingsAvailable,
  type EmbeddingResult,
  type EmbeddingConfig,
} from "./embeddings.js";

export {
  generateConsolidatedText,
  memoriesToConsolidationInput,
  type ConsolidationInput,
  type ConsolidationOutput,
} from "./llm.js";

export {
  computeTextQuality,
  computeRecallScore,
  computeAgeScore,
  computeConsolidationScore,
  computeQualityScore,
  getHealthStatus,
  computeRepositoryHealth,
  type QualityFactors,
  type QualityScore,
  type MemoryStats,
  type RepositoryHealth,
} from "./quality.js";

export {
  generateSuggestions,
  formatSuggestion,
  type SuggestionType,
  type Suggestion,
  type SuggestionResult,
} from "./suggestions.js";

export {
  findConsolidationCandidates,
  executeConsolidation,
  autoConsolidate,
  formatCandidatePreview,
  type ConsolidationCandidate,
  type AutoConsolidateOptions,
  type AutoConsolidateResult,
  type ExecuteConsolidationOptions,
  type ExecuteConsolidationResult,
} from "./auto-consolidate.js";

export {
  findConsolidationCandidatesRemote,
  executeConsolidationRemote,
  autoConsolidateRemote,
} from "./auto-consolidate-remote.js";

export { buildAutoLinkQuery } from "./auto-link.js";

export {
  getNotifications,
  formatNotification,
  formatNotificationsSummary,
  type NotificationType,
  type Notification,
  type NotificationResult,
} from "./notifications.js";

export {
  runLocalLifecycleMaintenance,
  runRemoteLifecycleMaintenance,
  type StrengthenedMemoryCandidate,
  type ExpiringMemoryCandidate,
  type LifecycleMaintenanceResult,
  type LifecycleMaintenanceOptions,
} from "./lifecycle-maintenance.js";

export {
  SyncService,
  createSyncService,
  type SyncServiceOptions,
  type SyncServiceResult,
  type SyncServiceStatus,
} from "./sync-service.js";

export {
  getTemplate,
  applyTemplate,
  formatTemplateList,
  MEMORY_TEMPLATES,
} from "./templates.js";
