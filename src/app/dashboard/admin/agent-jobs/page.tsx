"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  getAgentJobs,
  retryAgentJob,
  type AgentJob,
} from "@/services/admin";

const statusStyles: Record<string, string> = {
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

const statusTabs = [
  { value: "", label: "All" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

function formatTarget(job: AgentJob) {
  if (!job.targetType || !job.targetId) return "-";
  return `${job.targetType.replace(/_/g, " ")} · ${job.targetId.slice(0, 8)}`;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

export default function AdminAgentJobsPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [jobTypeInput, setJobTypeInput] = useState("");
  const [jobType, setJobType] = useState("");
  const limit = 20;

  const totalPages = Math.ceil(total / limit);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAgentJobs({
        page,
        limit,
        status: status || undefined,
        jobType: jobType || undefined,
      });
      setJobs(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load agent jobs");
    } finally {
      setLoading(false);
    }
  }, [jobType, page, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadJobs();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadJobs]);

  const counts = useMemo(
    () => ({
      failed: jobs.filter((job) => job.status === "failed").length,
      running: jobs.filter((job) => job.status === "running").length,
      queued: jobs.filter((job) => job.status === "queued").length,
    }),
    [jobs],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const handleRetry = async (job: AgentJob) => {
    setRetryingJobId(job.id);

    try {
      const retried = await retryAgentJob(job.id);
      setJobs((current) =>
        current.map((item) => (item.id === job.id ? retried : item)),
      );
      toast.success("Agent job queued", "The worker will retry this job.");
      void loadJobs();
    } catch (err) {
      toast.error(
        "Retry failed",
        err instanceof Error ? err.message : "Could not retry agent job",
      );
    } finally {
      setRetryingJobId(null);
    }
  };

  const clearFilters = () => {
    setStatus("");
    setJobType("");
    setJobTypeInput("");
    setPage(1);
  };

  return (
    <DashboardShell
      role="admin"
      title="Agent Jobs"
      subtitle="Inspect queued AI work, failures, retries, and payloads."
    >
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow">
          <p className="text-sm text-on-surface-variant">Queued on this page</p>
          <p className="mt-1 font-headline text-2xl font-semibold text-on-surface">
            {counts.queued}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow">
          <p className="text-sm text-on-surface-variant">Running on this page</p>
          <p className="mt-1 font-headline text-2xl font-semibold text-on-surface">
            {counts.running}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow">
          <p className="text-sm text-on-surface-variant">Failed on this page</p>
          <p className="mt-1 font-headline text-2xl font-semibold text-error">
            {counts.failed}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={
              status === tab.value
                ? "rounded-full bg-primary-container px-4 py-1.5 text-sm font-medium text-on-primary-container"
                : "rounded-full bg-surface-container-low px-4 py-1.5 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container-high"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
          <input
            value={jobTypeInput}
            onChange={(event) => setJobTypeInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setJobType(jobTypeInput.trim());
                setPage(1);
              }
            }}
            placeholder="Filter by job type..."
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 text-sm text-on-surface outline-none focus:border-primary-container"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          loading={refreshing}
          onClick={() => void handleRefresh()}
          className="!w-auto px-3 py-2 text-sm"
        >
          <RefreshCw size={15} />
          Refresh
        </Button>
        {(status || jobType) ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low"
          >
            <X size={16} />
            Clear
          </button>
        ) : null}
      </div>

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
          No agent jobs match your filters.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-high">
                <tr>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Job
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Target
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Attempts
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Last update
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-on-surface-variant">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-t border-outline-variant/20 hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-on-surface">
                        {job.jobType.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {job.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {formatTarget(job)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[job.status] ||
                          "border border-outline-variant/50 bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {job.status === "failed" ? (
                          <AlertCircle size={13} />
                        ) : job.status === "completed" ? (
                          <CheckCircle size={13} />
                        ) : null}
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {job.attempts}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                      {formatDate(job.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-nowrap items-center justify-end gap-2">
                        {job.status === "failed" ? (
                          <Button
                            type="button"
                            loading={retryingJobId === job.id}
                            onClick={() => void handleRetry(job)}
                            className="!w-auto rounded-full px-3 py-1.5 text-xs"
                          >
                            <RefreshCw size={14} />
                            Retry
                          </Button>
                        ) : null}
                        <Link href={`/dashboard/admin/agent-jobs/${job.id}`}>
                          <Button
                            variant="outline"
                            className="!w-auto rounded-full px-3 py-1.5 text-xs"
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

          {totalPages > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-on-surface-variant">
                Showing {jobs.length} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="!w-auto px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-on-surface-variant">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  className="!w-auto px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </DashboardShell>
  );
}
