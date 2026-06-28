"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
  Tag,
  Link2,
  Trash2,
  ArrowUp,
  Zap,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  buildReviewPayload,
  removeReviewedSuggestion,
  type DashboardSuggestion,
} from "@/lib/curation-review";

type Suggestion = DashboardSuggestion;

interface HealthResponse {
  overallScore: number;
  status: "healthy" | "needs_attention" | "critical";
  memoryCounts: {
    total: number;
    healthy: number;
    needsAttention: number;
    critical: number;
  };
  topIssues: Array<{
    type: string;
    count: number;
    description: string;
  }>;
}

interface EmbeddingStats {
  total: number;
  withEmbedding: number;
  withoutEmbedding: number;
}

const priorityColors = {
  high: "bg-foreground/15 text-foreground border-foreground/20",
  medium: "bg-white/[0.08] text-muted-foreground border-muted-foreground/20",
  low: "bg-white/[0.04] text-muted-foreground/70 border-muted-foreground/15",
};

const typeIcons: Record<string, React.ReactNode> = {
  consolidate: <Sparkles className="h-4 w-4" />,
  deprecate: <Trash2 className="h-4 w-4" />,
  add_tags: <Tag className="h-4 w-4" />,
  add_links: <Link2 className="h-4 w-4" />,
  promote: <ArrowUp className="h-4 w-4" />,
  generate_embedding: <Zap className="h-4 w-4" />,
  review: <Activity className="h-4 w-4" />,
};

export default function CurationPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [embeddingStats, setEmbeddingStats] = useState<EmbeddingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [suggestionsRes, healthRes, embeddingsRes] = await Promise.all([
        fetch("/api/suggestions").then((r) => r.json()),
        fetch("/api/health").then((r) => r.json()),
        fetch("/api/embeddings/stats").then((r) => r.json()),
      ]);

      setSuggestions(suggestionsRes.suggestions || []);
      setHealth(healthRes);
      setEmbeddingStats(embeddingsRes);
    } catch (error) {
      console.error("Failed to fetch curation data:", error);
      toast.error("Failed to load curation data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleGenerateSuggestions = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/suggestions?generate=true");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate suggestions");
      }
      setSuggestions(data.suggestions || []);
      toast.success(
        `Generated ${data.stats?.suggestionsGenerated ?? 0}; created ${data.stats?.created ?? 0} review items`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate suggestions");
    } finally {
      setGenerating(false);
    }
  };

  const handleReviewSuggestion = async (
    suggestion: Suggestion,
    status: "approved" | "rejected",
  ) => {
    setReviewingId(suggestion.id);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildReviewPayload(
            suggestion.id,
            status,
            status === "approved" ? "Approved from dashboard" : "Rejected from dashboard",
          ),
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to mark suggestion ${status}`);
      }
      setSuggestions((current) => removeReviewedSuggestion(current, suggestion.id));
      toast.success(`Suggestion ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to mark suggestion ${status}`);
    } finally {
      setReviewingId(null);
    }
  };

  const handleRunBackfill = async () => {
    try {
      const res = await fetch("/api/embeddings/backfill", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Generated ${data.processed} embeddings`);
        fetchData();
      } else {
        toast.error(data.error || "Backfill failed");
      }
    } catch (_error) {
      toast.error("Failed to run backfill");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  const healthScore = health?.overallScore ?? 0;
  const healthColor =
    health?.status === "healthy"
      ? "text-foreground"
      : health?.status === "needs_attention"
        ? "text-muted-foreground"
        : "text-muted-foreground/60";

  const embeddingCoverage = embeddingStats
    ? (embeddingStats.withEmbedding / Math.max(1, embeddingStats.total)) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Memory Curation</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered suggestions to improve memory quality
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleGenerateSuggestions}
            disabled={generating}
          >
            <Sparkles className={`h-4 w-4 mr-2 ${generating ? "animate-pulse" : ""}`} />
            Generate review inbox
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-dracula-current border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${healthColor}`}>
                {Math.round(healthScore * 100)}%
              </div>
              <div className="flex-1">
                <Progress value={healthScore * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {health?.status?.replace("_", " ") || "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dracula-current border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Memory Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {health?.memoryCounts.healthy ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Healthy</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {health?.memoryCounts.needsAttention ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Attention</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground/60">
                  {health?.memoryCounts.critical ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dracula-current border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Embedding Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-foreground">
                {Math.round(embeddingCoverage)}%
              </div>
              <div className="flex-1">
                <Progress value={embeddingCoverage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {embeddingStats?.withEmbedding ?? 0} / {embeddingStats?.total ?? 0} memories
                </p>
              </div>
            </div>
            {embeddingStats && embeddingStats.withoutEmbedding > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                onClick={handleRunBackfill}
              >
                <Zap className="h-4 w-4 mr-2" />
                Generate Missing Embeddings
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {health?.topIssues && health.topIssues.length > 0 && (
        <Card className="bg-dracula-current border-border/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              Top Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {health.topIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-background"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {issue.type}
                    </Badge>
                    <span className="text-sm text-foreground">{issue.description}</span>
                  </div>
                  <Badge variant="secondary">{issue.count}x</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-dracula-current border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-foreground" />
            Suggestions ({suggestions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">All caught up!</p>
              <p className="text-muted-foreground text-sm">
                No suggestions at this time. Your memory base is healthy.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-background hover:bg-background/80 transition-colors"
                >
                  <div
                    className={`p-2 rounded-lg ${priorityColors[suggestion.priority]}`}
                  >
                    {typeIcons[suggestion.type] || <Activity className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={priorityColors[suggestion.priority]}
                      >
                        {suggestion.priority}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {suggestion.type.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{suggestion.reason}</p>
                    {suggestion.action && (
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-xs bg-background px-2 py-1 rounded text-foreground">
                          {suggestion.action.command}
                        </code>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {suggestion.action.description}
                        </span>
                      </div>
                    )}
                    {suggestion.memoryIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {suggestion.memoryIds.slice(0, 5).map((id) => (
                          <Badge key={id} variant="outline" className="text-xs font-mono">
                            {id.slice(0, 8)}
                          </Badge>
                        ))}
                        {suggestion.memoryIds.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{suggestion.memoryIds.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reviewingId === suggestion.id}
                        onClick={() => handleReviewSuggestion(suggestion, "approved")}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={reviewingId === suggestion.id}
                        onClick={() => handleReviewSuggestion(suggestion, "rejected")}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
