"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, RefreshCw, RotateCcw } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DeliveryEmpty, DeliveryError } from "@/components/delivery";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/ui/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { listAdminDeliverySubmissions } from "@/services/project-submissions";
import type { ProjectSubmission, SubmissionStatus } from "@/types/delivery";

type ReviewFilter = "pending" | "revisions" | "completed" | "all";

const FILTERS: Array<{ value: ReviewFilter; label: string }> = [
  { value: "pending", label: "Needs review" },
  { value: "revisions", label: "Changes requested" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

const PENDING_STATUSES = new Set<SubmissionStatus>([
  "submitted",
  "under_review",
]);
const REVISION_STATUSES = new Set<SubmissionStatus>([
  "changes_requested",
  "rejected",
]);
const COMPLETED_STATUSES = new Set<SubmissionStatus>([
  "approved",
  "superseded",
]);

function visibleForFilter(submission: ProjectSubmission, filter: ReviewFilter) {
  if (filter === "pending") return PENDING_STATUSES.has(submission.status);
  if (filter === "revisions") return REVISION_STATUSES.has(submission.status);
  if (filter === "completed") return COMPLETED_STATUSES.has(submission.status);
  return true;
}

function reviewPriority(status: SubmissionStatus) {
  if (status === "under_review") return 0;
  if (status === "submitted") return 1;
  if (status === "changes_requested") return 2;
  if (status === "rejected") return 3;
  if (status === "approved") return 4;
  if (status === "superseded") return 5;
  return 6;
}

function formatTimestamp(value: string | null) {
  if (!value) return "Not submitted";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminReviewsPage() {
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const loadInFlightRef = useRef(false);
  const [filter, setFilter] = useState<ReviewFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showLoading = false) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    if (showLoading) setLoading(true);
    try {
      const result = await listAdminDeliverySubmissions({ limit: 100 });
      setSubmissions(result.items);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load submission reviews.",
      );
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(true), 0);
    const interval = window.setInterval(() => void load(), 10_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  const counts = useMemo(
    () => ({
      pending: submissions.filter((item) => PENDING_STATUSES.has(item.status))
        .length,
      revisions: submissions.filter((item) =>
        REVISION_STATUSES.has(item.status),
      ).length,
      completed: submissions.filter((item) =>
        COMPLETED_STATUSES.has(item.status),
      ).length,
    }),
    [submissions],
  );
  const visible = useMemo(
    () =>
      submissions
        .filter((submission) => visibleForFilter(submission, filter))
        .sort((left, right) => {
          const statusDifference =
            reviewPriority(left.status) - reviewPriority(right.status);
          if (statusDifference !== 0) return statusDifference;
          return (
            new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime()
          );
        }),
    [filter, submissions],
  );

  return (
    <DashboardShell
      role="admin"
      title="Reviews"
      subtitle="Live implementation-submission queue with automated evidence and recorded human verdicts."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          label="Needs human review"
          value={counts.pending}
          icon={<Clock3 size={18} />}
        />
        <StatsCard
          label="Revision cycle"
          value={counts.revisions}
          icon={<RotateCcw size={18} />}
        />
        <StatsCard
          label="Completed"
          value={counts.completed}
          icon={<CheckCircle2 size={18} />}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" aria-label="Review status filter">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                filter === option.value
                  ? "border-primary-container bg-primary-container text-on-primary"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary-container hover:text-primary-container"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void load(true)}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      <div className="mt-4">
        {error && submissions.length > 0 && (
          <div className="mb-4">
            <DeliveryError message={error} onRetry={() => void load(true)} />
          </div>
        )}
        {error && submissions.length === 0 ? (
          <DeliveryError message={error} onRetry={() => void load(true)} />
        ) : loading && submissions.length === 0 ? (
          <p className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant card-shadow">
            Loading review queue...
          </p>
        ) : visible.length === 0 ? (
          <DeliveryEmpty
            title={
              filter === "pending"
                ? "No submissions need review"
                : "No matching submissions"
            }
            description="The queue updates automatically when a freelancer submits work or a decision changes."
          />
        ) : (
          <ol className="space-y-3" aria-live="polite">
            {visible.map((submission) => (
              <li key={submission.id}>
                <Link
                  href={`/dashboard/admin/submissions/${submission.id}`}
                  className="flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold text-on-surface">
                        {submission.title || "Untitled submission"}
                      </h2>
                      <span className="text-xs text-on-surface-variant">
                        Version {submission.version}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Submitted {formatTimestamp(submission.submittedAt)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-on-surface-variant">
                      Project {submission.projectId.slice(0, 8)}
                      {submission.taskId
                        ? ` · Task ${submission.taskId.slice(0, 8)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={submission.status} />
                    <span className="text-sm font-semibold text-primary-container">
                      Open review →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </DashboardShell>
  );
}
