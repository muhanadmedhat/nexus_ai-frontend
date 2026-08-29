"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileCheck2,
  GitPullRequest,
  Loader2,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getAdminPlanningSubmissions,
  getAdminProjectPlans,
  getAdminProjects,
} from "@/services/admin";
import { listAdminDeliverySubmissions } from "@/services/project-submissions";
import { listAdminReleaseRequests } from "@/services/release-requests";
import { formatMoney } from "@/utils/format";

type RawRow = Record<string, unknown>;
type QueueKind = "planning" | "plan" | "implementation" | "release";
type QueueFilter = "all" | QueueKind;

interface WorkItem {
  id: string;
  kind: QueueKind;
  projectId: string;
  projectTitle: string;
  title: string;
  detail: string;
  status: string;
  timestamp: string | null;
  href: string;
}

const FILTERS: Array<{
  value: QueueFilter;
  label: string;
  icon?: React.ReactNode;
}> = [
  { value: "all", label: "All work" },
  {
    value: "planning",
    label: "Planning deliverables",
    icon: <ClipboardCheck size={15} />,
  },
  { value: "plan", label: "Scrum plans", icon: <FileCheck2 size={15} /> },
  {
    value: "implementation",
    label: "Implementation",
    icon: <GitPullRequest size={15} />,
  },
  {
    value: "release",
    label: "Payment releases",
    icon: <WalletCards size={15} />,
  },
];

const KIND_LABELS: Record<QueueKind, string> = {
  planning: "Planning deliverable",
  plan: "Scrum plan",
  implementation: "Implementation submission",
  release: "Payment release",
};

const KIND_ICONS: Record<QueueKind, React.ReactNode> = {
  planning: <ClipboardCheck size={18} />,
  plan: <FileCheck2 size={18} />,
  implementation: <GitPullRequest size={18} />,
  release: <WalletCards size={18} />,
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function dateValue(row: RawRow, ...keys: string[]) {
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }
  return null;
}

function formatTimestamp(value: string | null) {
  if (!value) return "Waiting in queue";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function priority(item: WorkItem) {
  if (item.status === "under_review") return 0;
  if (item.status === "submitted" || item.status === "generated") return 1;
  if (item.status === "approved") return 2;
  return 3;
}

async function withinLoadWindow<T>(promise: Promise<T>) {
  let timeout: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = window.setTimeout(
          () => reject(new Error("Review source did not respond in time")),
          10_000,
        );
      }),
    ]);
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
}

export default function AdminReviewsPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    const [
      planningResult,
      plansResult,
      implementationResult,
      releasesResult,
      projectsResult,
    ] = await Promise.allSettled([
      withinLoadWindow(getAdminPlanningSubmissions({ limit: 100 })),
      withinLoadWindow(getAdminProjectPlans({ limit: 100 })),
      withinLoadWindow(listAdminDeliverySubmissions({ limit: 100 })),
      withinLoadWindow(listAdminReleaseRequests({ limit: 100 })),
      withinLoadWindow(getAdminProjects({ limit: 100 })),
    ]);

    const failures: string[] = [];
    if (planningResult.status === "rejected")
      failures.push("planning deliverables");
    if (plansResult.status === "rejected") failures.push("Scrum plans");
    if (implementationResult.status === "rejected")
      failures.push("implementation submissions");
    if (releasesResult.status === "rejected")
      failures.push("payment releases");
    if (projectsResult.status === "rejected") failures.push("project names");

    const projectNames = new Map<string, string>();
    if (projectsResult.status === "fulfilled") {
      for (const project of projectsResult.value.data) {
        projectNames.set(project.id, project.title);
      }
    }
    const projectTitle = (projectId: string, fallback?: unknown) =>
      text(fallback) ||
      projectNames.get(projectId) ||
      `Project ${projectId.slice(0, 8)}`;

    const next: WorkItem[] = [];

    if (planningResult.status === "fulfilled") {
      for (const row of planningResult.value.data as RawRow[]) {
        const status = text(row.status);
        if (!["submitted", "under_review"].includes(status)) continue;
        const id = text(row.id);
        const projectId = text(row.projectId);
        next.push({
          id,
          kind: "planning",
          projectId,
          projectTitle: projectTitle(projectId, row.projectTitle),
          title: `${text(row.submissionType).replaceAll("_", " ") || "Planning"} deliverable`,
          detail: `${text(row.freelancerName) || "Planning freelancer"} · Version ${Number(row.version) || 1}`,
          status,
          timestamp: dateValue(row, "submittedAt", "updatedAt", "createdAt"),
          href: `/dashboard/admin/planning/submissions/${id}`,
        });
      }
    }

    if (plansResult.status === "fulfilled") {
      for (const row of plansResult.value.data as RawRow[]) {
        const status = text(row.status);
        if (!["generated", "under_review"].includes(status)) continue;
        const id = text(row.id);
        const projectId = text(row.projectId);
        next.push({
          id,
          kind: "plan",
          projectId,
          projectTitle: projectTitle(projectId, row.projectTitle),
          title: `Scrum plan v${Number(row.version) || 1}`,
          detail: `${Number(row.milestoneCount) || 0} milestones · ${Number(row.taskCount) || 0} tasks`,
          status,
          timestamp: dateValue(row, "updatedAt", "createdAt"),
          href: `/dashboard/admin/project-plans/${id}`,
        });
      }
    }

    if (implementationResult.status === "fulfilled") {
      for (const submission of implementationResult.value.items) {
        if (!["submitted", "under_review"].includes(submission.status))
          continue;
        next.push({
          id: submission.id,
          kind: "implementation",
          projectId: submission.projectId,
          projectTitle: projectTitle(submission.projectId),
          title: submission.title || "Implementation submission",
          detail: `Version ${submission.version}${submission.taskId ? ` · Task ${submission.taskId.slice(0, 8)}` : ""}`,
          status: submission.status,
          timestamp: submission.submittedAt || submission.updatedAt,
          href: `/dashboard/admin/submissions/${submission.id}`,
        });
      }
    }

    if (releasesResult.status === "fulfilled") {
      for (const release of releasesResult.value.items) {
        if (!["pending", "approved"].includes(release.status)) continue;
        next.push({
          id: release.id,
          kind: "release",
          projectId: release.projectId,
          projectTitle: projectTitle(release.projectId),
          title: formatMoney(Number(release.amount) || 0, release.currency),
          detail:
            release.status === "approved"
              ? "Approved and waiting for release"
              : release.reason || "Payment release decision required",
          status: release.status,
          timestamp: release.updatedAt || release.createdAt,
          href: "/dashboard/admin/payment-release-requests",
        });
      }
    }

    next.sort((left, right) => {
      const priorityDifference = priority(left) - priority(right);
      if (priorityDifference) return priorityDifference;
      return (
        new Date(right.timestamp || 0).getTime() -
        new Date(left.timestamp || 0).getTime()
      );
    });

    setItems(next);
    setErrors(failures);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(true), 0);
    const interval = window.setInterval(() => void load(), 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [load]);

  const counts = useMemo(
    () =>
      items.reduce(
        (result, item) => ({
          ...result,
          [item.kind]: result[item.kind] + 1,
        }),
        { planning: 0, plan: 0, implementation: 0, release: 0 },
      ),
    [items],
  );

  const visible = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((item) => item.kind === filter),
    [filter, items],
  );

  return (
    <DashboardShell
      role="admin"
      title="Review Queue"
      subtitle="Every human decision waiting across planning, delivery, and payment."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {FILTERS.slice(1).map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setFilter(entry.value)}
            className="flex items-center justify-between rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4 text-left transition hover:border-primary-container/40 hover:bg-surface-container-low"
          >
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                {entry.icon}
                {entry.label}
              </span>
              <span className="mt-1 block text-xs text-on-surface-variant">
                Needs a decision
              </span>
            </span>
            <span className="font-headline text-2xl font-semibold text-on-surface">
              {counts[entry.value as QueueKind]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
        <div className="flex flex-wrap gap-2" aria-label="Review queue type">
          {FILTERS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              aria-pressed={filter === entry.value}
              onClick={() => setFilter(entry.value)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                filter === entry.value
                  ? "bg-primary-container text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void load(true)}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {errors.length ? (
        <p className="mt-4 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          Could not refresh {errors.join(", ")}. The other queues are still
          current.
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-20 text-on-surface-variant">
          <Loader2 className="mr-2 animate-spin" /> Loading review work...
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-semibold text-on-surface">No decisions waiting</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            This queue refreshes when planning or implementation work is
            submitted.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-outline-variant/30" aria-live="polite">
          {visible.map((item) => (
            <li key={`${item.kind}:${item.id}`} className="py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
                    {KIND_ICONS[item.kind]}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase text-on-surface-variant">
                        {KIND_LABELS[item.kind]}
                      </p>
                      <StatusBadge status={item.status} />
                    </div>
                    <h2 className="mt-1 font-semibold text-on-surface">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {item.projectTitle} · {item.detail}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {formatTimestamp(item.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/admin/projects/${item.projectId}`}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  >
                    Project workspace
                  </Link>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-3 py-2 text-sm font-semibold text-on-primary"
                  >
                    Review <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </DashboardShell>
  );
}
