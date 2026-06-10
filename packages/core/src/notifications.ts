import type { ILocalStore } from "unforgit-shared";
import { generateSuggestions } from "./suggestions.js";

export type NotificationType =
  | "pending_suggestions"
  | "sync_stale"
  | "conflicts_pending"
  | "embeddings_missing"
  | "maintenance_needed";

export interface Notification {
  id: string;
  type: NotificationType;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  action?: {
    command: string;
    description: string;
  };
  createdAt: Date;
}

export interface NotificationResult {
  notifications: Notification[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

export function getNotifications(
  store: ILocalStore,
  orgId: string,
  repoId: string
): NotificationResult {
  const notifications: Notification[] = [];
  const now = new Date();

  const syncSummary = store.getSyncSummary(orgId, repoId);

  if (syncSummary.conflicts > 0) {
    notifications.push({
      id: "conflicts-pending",
      type: "conflicts_pending",
      priority: "high",
      title: "Sync Conflicts",
      message: `You have ${syncSummary.conflicts} unresolved sync conflict(s) that need attention.`,
      action: {
        command: "unforgit status",
        description: "View conflicts",
      },
      createdAt: now,
    });
  }

  const embeddingStats = store.getEmbeddingStats(orgId, repoId);

  if (embeddingStats.withoutEmbedding > 10) {
    notifications.push({
      id: "embeddings-missing",
      type: "embeddings_missing",
      priority: "medium",
      title: "Missing Embeddings",
      message: `${embeddingStats.withoutEmbedding} memories lack embeddings. Semantic search quality is reduced.`,
      action: {
        command: "unforgit embeddings backfill",
        description: "Generate missing embeddings",
      },
      createdAt: now,
    });
  }

  const suggestions = generateSuggestions(store, orgId, repoId, { maxSuggestions: 10 });

  const highPrioritySuggestions = suggestions.suggestions.filter(
    (s) => s.priority === "high"
  ).length;

  if (highPrioritySuggestions > 0) {
    notifications.push({
      id: "suggestions-high-priority",
      type: "pending_suggestions",
      priority: "medium",
      title: "Curation Suggestions",
      message: `${highPrioritySuggestions} high-priority curation suggestion(s) available.`,
      action: {
        command: "unforgit web",
        description: "Open curation dashboard",
      },
      createdAt: now,
    });
  }

  if (syncSummary.pendingPush > 20) {
    notifications.push({
      id: "sync-stale",
      type: "sync_stale",
      priority: "low",
      title: "Pending Sync",
      message: `${syncSummary.pendingPush} memories waiting to be pushed to remote.`,
      action: {
        command: "unforgit push",
        description: "Push changes to remote",
      },
      createdAt: now,
    });
  }

  const unusedMemories = store.getUnusedMemories(orgId, repoId, 90);
  if (unusedMemories.length > 10) {
    notifications.push({
      id: "maintenance-unused",
      type: "maintenance_needed",
      priority: "low",
      title: "Maintenance Recommended",
      message: `${unusedMemories.length} memories haven't been recalled in 90+ days. Consider reviewing or deprecating.`,
      action: {
        command: "unforgit web",
        description: "Open curation dashboard",
      },
      createdAt: now,
    });
  }

  notifications.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const summary = {
    total: notifications.length,
    high: notifications.filter((n) => n.priority === "high").length,
    medium: notifications.filter((n) => n.priority === "medium").length,
    low: notifications.filter((n) => n.priority === "low").length,
  };

  return { notifications, summary };
}

export function formatNotification(notification: Notification): string {
  const priorityEmoji = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
  };

  const lines = [
    `${priorityEmoji[notification.priority]} ${notification.title}`,
    `  ${notification.message}`,
  ];

  if (notification.action) {
    lines.push(`  → ${notification.action.command}`);
  }

  return lines.join("\n");
}

export function formatNotificationsSummary(result: NotificationResult): string {
  if (result.notifications.length === 0) {
    return "No notifications. Everything is up to date!";
  }

  const parts = [
    `${result.summary.total} notification(s):`,
    `  High: ${result.summary.high}`,
    `  Medium: ${result.summary.medium}`,
    `  Low: ${result.summary.low}`,
    "",
    ...result.notifications.map(formatNotification),
  ];

  return parts.join("\n");
}
