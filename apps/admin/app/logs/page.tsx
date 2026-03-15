"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Brain,
  Clock,
  Key,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch, getUser } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ApiKeyLog {
  id: string;
  apiKeyId: string;
  operation: string;
  orgId: string;
  repoId: string;
  memoryId: string | null;
  query: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  apiKey: {
    id: string;
    name: string;
    label: string | null;
    user: {
      id: string;
      githubLogin: string;
      name: string | null;
    } | null;
  };
}

const ITEMS_PER_PAGE = 20;

export default function LogsPage() {
  const [logs, setLogs] = useState<ApiKeyLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [operationFilter, setOperationFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    setIsAdmin(currentUser?.isAdmin ?? false);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(ITEMS_PER_PAGE));
      params.set("offset", String(page * ITEMS_PER_PAGE));
      if (operationFilter) {
        params.set("operation", operationFilter);
      }

      const data = await apiFetch<{ logs: ApiKeyLog[]; total: number }>(
        `/api/logs?${params.toString()}`
      );
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [page, operationFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = searchQuery
    ? logs.filter((log) => {
        const search = searchQuery.toLowerCase();
        return (
          log.apiKey.name.toLowerCase().includes(search) ||
          log.apiKey.label?.toLowerCase().includes(search) ||
          log.orgId.toLowerCase().includes(search) ||
          log.repoId.toLowerCase().includes(search) ||
          log.query?.toLowerCase().includes(search) ||
          log.apiKey.user?.githubLogin.toLowerCase().includes(search)
        );
      })
    : logs;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOperationBadgeClass = (operation: string) => {
    switch (operation) {
      case "create_memory":
        return "bg-green-500/20 text-green-400";
      case "recall":
        return "bg-blue-500/20 text-blue-400";
      case "update":
        return "bg-amber-500/20 text-amber-400";
      case "delete":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-foreground/10 text-foreground/70";
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const createCount = logs.filter((l) => l.operation === "create_memory").length;
  const recallCount = logs.filter((l) => l.operation === "recall").length;

  return (
    <AuthGuard>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 py-6 sm:py-10">
          <div className="animate-fade-in space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div>
                <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight">
                  {isAdmin ? "API Logs" : "My Logs"}
                </h1>
                <p className="text-[12px] sm:text-[13px] text-muted-foreground">
                  {total.toLocaleString()} total entries
                </p>
              </div>
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-white/[0.04] px-3 sm:px-3.5 py-2 text-[12px] sm:text-[13px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{total.toLocaleString()}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">Total Logs</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-green-500/20">
                    <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{createCount}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">Memories Created</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/30 bg-dracula-current p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-500/20">
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[24px] font-bold">{recallCount}</p>
                    <p className="text-[11px] sm:text-[12px] text-muted-foreground">Recalls</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-white/[0.04] py-2 sm:py-2.5 pl-10 pr-4 text-[13px] sm:text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <select
                  value={operationFilter}
                  onChange={(e) => {
                    setOperationFilter(e.target.value);
                    setPage(0);
                  }}
                  className="w-full sm:w-auto appearance-none rounded-xl border border-border/50 bg-white/[0.04] py-2 sm:py-2.5 pl-10 pr-8 text-[13px] sm:text-[14px] text-foreground focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                >
                  <option value="">All operations</option>
                  <option value="create_memory">Create Memory</option>
                  <option value="recall">Recall</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {loading && logs.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-border/30 bg-dracula-current">
                <Loader2 className="h-6 w-6 animate-spin text-foreground/50" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-border/30 bg-dracula-current">
                <FileText className="h-12 w-12 text-foreground/20" />
                <p className="text-[13px] text-muted-foreground">No logs found</p>
                <p className="text-[12px] text-muted-foreground/70">
                  Logs will appear here when API keys are used
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block rounded-xl border border-border/30 bg-dracula-current overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30 hover:bg-transparent">
                        <TableHead className="w-[140px]">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            Time
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <Key className="h-3.5 w-3.5" />
                            API Key
                          </div>
                        </TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Repository</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id} className="border-border/30">
                          <TableCell className="text-muted-foreground text-[13px]">
                            {formatDate(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-[13px]">{log.apiKey.name}</span>
                              {log.apiKey.label && (
                                <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                  {log.apiKey.label}
                                </span>
                              )}
                              {log.apiKey.user && (
                                <span className="text-[11px] text-muted-foreground">
                                  @{log.apiKey.user.githubLogin}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ${getOperationBadgeClass(
                                log.operation
                              )}`}
                            >
                              {log.operation.replace("_", " ")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-[12px] text-muted-foreground">
                              {log.orgId}/{log.repoId}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            {log.query && (
                              <span className="text-[12px] text-muted-foreground truncate block">
                                Query: {log.query}
                              </span>
                            )}
                            {log.memoryId && (
                              <span className="text-[12px] text-muted-foreground truncate block font-mono">
                                Memory: {log.memoryId.slice(0, 8)}...
                              </span>
                            )}
                            {log.metadata && (
                              <span className="text-[11px] text-muted-foreground/70">
                                {log.metadata.resultsCount !== undefined && (
                                  <span>{log.metadata.resultsCount as number} results</span>
                                )}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-border/30 rounded-xl border border-border/30 bg-dracula-current overflow-hidden">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${getOperationBadgeClass(
                              log.operation
                            )}`}
                          >
                            {log.operation.replace("_", " ")}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 min-w-0">
                        <Key className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium text-[12px] truncate">{log.apiKey.name}</span>
                        {log.apiKey.user && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            @{log.apiKey.user.githubLogin}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[11px] text-muted-foreground">
                        <span className="font-mono">{log.orgId}/{log.repoId}</span>
                      </div>
                      
                      {(log.query || log.memoryId) && (
                        <div className="text-[10px] text-muted-foreground/70 space-y-0.5">
                          {log.query && (
                            <p className="truncate">Query: {log.query}</p>
                          )}
                          {log.memoryId && (
                            <p className="font-mono">Memory: {log.memoryId.slice(0, 8)}...</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-[12px] sm:text-[13px] text-muted-foreground text-center sm:text-left">
                  Showing {page * ITEMS_PER_PAGE + 1} -{" "}
                  {Math.min((page + 1) * ITEMS_PER_PAGE, total)} of {total}
                </p>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || loading}
                    className="flex items-center gap-1 rounded-lg border border-border/50 bg-white/[0.04] px-2.5 sm:px-3 py-1.5 text-[12px] sm:text-[13px] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <span className="px-2 text-[12px] sm:text-[13px] text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1 || loading}
                    className="flex items-center gap-1 rounded-lg border border-border/50 bg-white/[0.04] px-2.5 sm:px-3 py-1.5 text-[12px] sm:text-[13px] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
