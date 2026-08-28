"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  ClipboardCheck,
  Loader2,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getReviewerProjects, type ReviewerProject } from "@/services/reviewer";

export default function ReviewerProjectsPage() {
  const [projects, setProjects] = useState<ReviewerProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(() => {
    setLoading(true);
    setError(null);
    getReviewerProjects()
      .then(setProjects)
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Could not load projects",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadProjects, 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadProjects]);

  const orderedProjects = [...projects].sort(
    (left, right) => reviewCount(right) - reviewCount(left),
  );

  return (
    <DashboardShell
      role="freelancer"
      title="Principal reviewer"
      subtitle="All projects and decisions assigned to you, independent of notification links."
    >
      {loading ? (
        <div className="flex justify-center py-20 text-on-surface-variant">
          <Loader2 className="mr-2 animate-spin" /> Loading projects…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-error/30 bg-error/5 p-5 text-error">
          <p>{error}</p>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={loadProjects}
          >
            <RefreshCw size={15} /> Retry
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-outline-variant p-12 text-center">
          <ShieldCheck className="mx-auto mb-3 text-outline" size={36} />
          <h2 className="font-semibold text-on-surface">
            No reviewer assignments
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            When you accept a principal-reviewer invitation, its project appears
            here.
          </p>
          <Link
            href="/invitations"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2.5 text-sm font-semibold text-on-primary-container"
          >
            <MailCheck size={17} /> Review invitations
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <QueueSummary
              icon={<BellRing size={18} />}
              label="Decisions waiting"
              value={projects.reduce((sum, item) => sum + reviewCount(item), 0)}
            />
            <QueueSummary
              icon={<ClipboardCheck size={18} />}
              label="Open delivery tasks"
              value={projects.reduce(
                (sum, item) => sum + item.attention.openTasks,
                0,
              )}
            />
            <QueueSummary
              icon={<ShieldCheck size={18} />}
              label="Assigned projects"
              value={projects.length}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
          {orderedProjects.map((item) => {
            const decisions = reviewCount(item);
            return (
            <Link
              key={item.assignmentId}
              href={`/reviewer/projects/${item.project.id}`}
              className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow transition hover:border-primary-container/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                    Principal reviewer
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-on-surface">
                    {item.project.title}
                  </h2>
                </div>
                <StatusBadge status={item.project.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-md px-2 py-1 font-semibold ${
                    decisions > 0
                      ? "bg-primary-container/10 text-primary-container"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {decisions > 0
                    ? `${decisions} ${decisions === 1 ? "decision" : "decisions"} waiting`
                    : "No decisions waiting"}
                </span>
                {item.attention.openTasks > 0 && (
                  <span className="rounded-md bg-surface-container-high px-2 py-1 text-on-surface-variant">
                    {item.attention.openTasks} open delivery tasks
                  </span>
                )}
              </div>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  {item.budgetAmount
                    ? `${Number(item.budgetAmount).toLocaleString()} ${item.currency}`
                    : "Compensation allocated"}
                </span>
                <span className="flex items-center gap-1 font-medium text-primary-container">
                  Open workbench <ArrowRight size={15} />
                </span>
              </div>
            </Link>
            );
          })}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function reviewCount(item: ReviewerProject) {
  const attention = item.attention;
  return (
    attention.planningAwaitingReview +
    attention.generatedPlans +
    attention.matchingRuns +
    attention.submissionsAwaitingReview +
    attention.releaseRequests +
    attention.finalHandoffsAwaitingReview
  );
}

function QueueSummary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4">
      <span className="text-primary-container">{icon}</span>
      <div>
        <p className="text-2xl font-semibold text-on-surface">{value}</p>
        <p className="text-xs text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
}
