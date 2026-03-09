"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Star,
  GitPullRequest,
  MessageSquare,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ContributorStats {
  authorName: string;
  authorId: string;
  memoriesCreated: number;
  consolidationsCreated: number;
  totalContributions: number;
}

interface TopMemory {
  id: string;
  text: string;
  memoryType: string;
  tags: string[];
  usageCount: number;
  authorName?: string;
}

interface TeamStats {
  totalMemories: number;
  totalAuthors: number;
  memoriesThisWeek: number;
  consolidationsThisWeek: number;
  pendingConflicts: number;
}

interface TeamResponse {
  contributors: ContributorStats[];
  topMemories: TopMemory[];
  stats: TeamStats;
}

export default function TeamPage() {
  const [data, setData] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch team data:", error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-dracula-purple" />
      </div>
    );
  }

  const contributors = data?.contributors ?? [];
  const topMemories = data?.topMemories ?? [];
  const stats = data?.stats ?? {
    totalMemories: 0,
    totalAuthors: 0,
    memoriesThisWeek: 0,
    consolidationsThisWeek: 0,
    pendingConflicts: 0,
  };

  const maxContributions = Math.max(...contributors.map((c) => c.totalContributions), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dracula-fg">Team Dashboard</h1>
          <p className="text-dracula-comment text-sm mt-1">
            Team contributions and memory insights
          </p>
        </div>
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-dracula-current border-dracula-purple/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-dracula-comment flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Total Memories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-dracula-fg">
              {stats.totalMemories}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dracula-current border-dracula-purple/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-dracula-comment flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-dracula-cyan">
              {stats.totalAuthors}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dracula-current border-dracula-purple/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-dracula-comment flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              +{stats.memoriesThisWeek}
            </div>
            <p className="text-xs text-dracula-comment mt-1">
              {stats.consolidationsThisWeek} consolidations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-dracula-current border-dracula-purple/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-dracula-comment flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.pendingConflicts > 0 ? "text-red-400" : "text-green-400"}`}>
              {stats.pendingConflicts}
            </div>
            <p className="text-xs text-dracula-comment mt-1">
              {stats.pendingConflicts > 0 ? "Need resolution" : "All clear"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-dracula-current border-dracula-purple/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Top Contributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contributors.length === 0 ? (
              <p className="text-center text-dracula-comment py-8">
                No contributor data available
              </p>
            ) : (
              <div className="space-y-4">
                {contributors.slice(0, 10).map((contributor, idx) => (
                  <div key={contributor.authorId || idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                          idx === 1 ? "bg-gray-400/20 text-gray-400" :
                          idx === 2 ? "bg-amber-600/20 text-amber-500" :
                          "bg-dracula-bg text-dracula-comment"
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-dracula-fg">
                            {contributor.authorName || "Unknown"}
                          </p>
                          <p className="text-xs text-dracula-comment">
                            {contributor.memoriesCreated} memories, {contributor.consolidationsCreated} consolidations
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {contributor.totalContributions}
                      </Badge>
                    </div>
                    <Progress
                      value={(contributor.totalContributions / maxContributions) * 100}
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-dracula-current border-dracula-purple/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-dracula-purple" />
              Most Useful Memories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topMemories.length === 0 ? (
              <p className="text-center text-dracula-comment py-8">
                No usage data available yet
              </p>
            ) : (
              <div className="space-y-3">
                {topMemories.slice(0, 10).map((memory, idx) => (
                  <div
                    key={memory.id}
                    className="p-3 rounded-lg bg-dracula-bg hover:bg-dracula-bg/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {memory.memoryType}
                          </Badge>
                          <span className="text-xs text-dracula-comment font-mono">
                            {memory.id.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-sm text-dracula-fg line-clamp-2">
                          {memory.text}
                        </p>
                        {memory.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {memory.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-dracula-cyan">
                        <Zap className="h-4 w-4" />
                        <span className="font-bold">{memory.usageCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
