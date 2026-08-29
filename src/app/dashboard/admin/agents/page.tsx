"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  getAgentOverview,
  getAgentJobs,
  retryAgentJob,
  type AgentHealth,
  type AgentJob,
} from "@/services/admin";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Eye,
  RefreshCw,
} from "lucide-react";

const statusColorMap: Record<string, string> = {
  healthy:
    "border border-primary-container/20 bg-primary-container/10 text-primary-container",
  degraded:
    "border border-secondary/20 bg-secondary-container/70 text-on-secondary-container",
  failing: "border border-error/20 bg-error-container/40 text-error",
};

const jobStatusColor: Record<string, string> = {
  queued:
    "border border-secondary/20 bg-secondary-container/70 text-on-secondary-container",
  running:
    "border border-tertiary-container/20 bg-tertiary-container/10 text-tertiary-container",
  completed:
    "border border-primary-container/20 bg-primary-container/10 text-primary-container",
  failed: "border border-error/20 bg-error-container/40 text-error",
  cancelled:
    "border border-outline-variant/50 bg-surface-container-high text-on-surface-variant",
};

export default function AdminAgentsPage() {
  const toast = useToast();
  const [overview, setOverview] = useState<AgentHealth[]>([]);
  const [totals, setTotals] = useState({
    queued: 0,
    running: 0,
    completedToday: 0,
    failedToday: 0,
  });
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const limit = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [overviewData, jobsData] = await Promise.all([
        getAgentOverview(),
        getAgentJobs({
          status: statusFilter || undefined,
          page,
          limit,
        }),
      ]);

      setOverview(overviewData.agents);
      setTotals(overviewData.totals);
      setJobs(jobsData.data);
      setTotalJobs(jobsData.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent data");
    } finally {
      setLoading(false);
    }
  }, [limit, page, statusFilter]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadData]);

  const totalPages = Math.ceil(totalJobs / limit);

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const retried = await retryAgentJob(jobId);
      setJobs((current) =>
        current.map((job) => (job.id === retried.id ? retried : job)),
      );
      toast.success("Agent job queued", "The worker will retry it now.");
      void loadData();
    } catch (err) {
      toast.error(
        "Retry failed",
        err instanceof Error ? err.message : "Could not retry agent job",
      );
    } finally {
      setRetryingJobId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "healthy")
      return <CheckCircle className="h-4 w-4 text-primary-container" />;
    if (status === "degraded")
      return <AlertCircle className="h-4 w-4 text-on-secondary-container" />;
    return <XCircle className="h-4 w-4 text-error" />;
  };

  return (
    <DashboardShell
      role="admin"
      title="Agent Overview"
      subtitle="Monitor the health and performance of all AI agents."
    >
      {/* Totals */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4 text-center card-shadow">
          <p className="text-sm text-on-surface-variant">Queued</p>
          <p className="text-2xl font-bold text-on-surface">{totals.queued}</p>
        </div>
        <div className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4 text-center card-shadow">
          <p className="text-sm text-on-surface-variant">Running</p>
          <p className="text-2xl font-bold text-on-surface">{totals.running}</p>
        </div>
        <div className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4 text-center card-shadow">
          <p className="text-sm text-on-surface-variant">Completed Today</p>
          <p className="text-2xl font-bold text-primary-container">{totals.completedToday}</p>
        </div>
        <div className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4 text-center card-shadow">
          <p className="text-sm text-on-surface-variant">Failed Today</p>
          <p className="text-2xl font-bold text-error">{totals.failedToday}</p>
        </div>
      </div>

      {/* Agent Health Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {overview.map((agent) => (
          <div
            key={agent.name}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-on-surface capitalize">
                  {agent.name.replace("_", " ")}
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColorMap[agent.status]}`}
                  >
                    {getStatusIcon(agent.status)}
                    {agent.status}
                  </span>
                </div>
              </div>
              <div className="text-right text-xs text-on-surface-variant">
                <div>Queued: {agent.queued}</div>
                <div>Running: {agent.running}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-on-surface-variant">
              <div>
                Completed today:{" "}
                <span className="font-medium text-on-surface">
                  {agent.completedToday}
                </span>
              </div>
              <div>
                Failed today:{" "}
                <span className="font-medium text-error">
                  {agent.failedToday}
                </span>
              </div>
              <div>
                Last success:{" "}
                {agent.lastSuccessAt
                  ? new Date(agent.lastSuccessAt).toLocaleTimeString()
                  : "—"}
              </div>
              <div>
                Last failure:{" "}
                {agent.lastFailureAt
                  ? new Date(agent.lastFailureAt).toLocaleTimeString()
                  : "—"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Refresh */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setStatusFilter("");
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === ""
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            All
          </button>
          {["queued", "running", "completed", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          onClick={loadData}
          className="!w-auto px-3 py-1.5 text-sm"
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* Jobs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          {error}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center text-on-surface-variant">
          No agent jobs found.
        </div>
      ) : (
        <>
          <div className="admin-responsive-table-wrap rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
            <table className="admin-responsive-table text-left text-sm">
              <thead className="bg-surface-container-high">
                <tr>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Type
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Attempts
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Created
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-t border-outline-variant/20 hover:bg-surface-container-low"
                  >
                    <td data-label="Type" className="px-4 py-3 font-medium text-on-surface">
                      {job.jobType}
                    </td>
                    <td data-label="Status" className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          jobStatusColor[job.status] ||
                          "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td data-label="Attempts" className="px-4 py-3 text-on-surface-variant">
                      {job.attempts}
                    </td>
                    <td data-label="Created" className="px-4 py-3 text-xs text-on-surface-variant">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td data-label="Action" className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {job.status === "failed" ? (
                          <Button
                            type="button"
                            loading={retryingJobId === job.id}
                            onClick={() => void handleRetryJob(job.id)}
                            className="!w-auto px-3 py-1.5 text-sm"
                          >
                            <RefreshCw size={14} />
                            Retry
                          </Button>
                        ) : null}
                        <Link href={`/dashboard/admin/agent-jobs/${job.id}`}>
                          <Button
                            variant="outline"
                            className="!w-auto px-3 py-1.5 text-sm"
                          >
                            <Eye size={14} />
                            View
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">
                Showing {jobs.length} of {totalJobs}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="!w-auto px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm text-on-surface-variant">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  className="!w-auto px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
