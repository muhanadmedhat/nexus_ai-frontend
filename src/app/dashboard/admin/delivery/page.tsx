"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, CreditCard, MessageSquareWarning, UserPlus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatsCard } from "@/components/ui/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeliveryEmpty, DeliveryError, DeliveryLoading } from "@/components/delivery";
import {
  getDeliveryProjectSummary,
  listDeliveryProjects,
  type DeliveryProjectSummary,
} from "@/services/delivery-overview";
import { formatMoney } from "@/utils/format";

/** Cap the per-project fan-out until a single aggregate endpoint exists (R11). */
const MAX_PROJECTS = 12;

export default function AdminDeliveryPage() {
  const [summaries, setSummaries] = useState<DeliveryProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    listDeliveryProjects()
      .then((projects) => {
        setTruncated(Math.max(0, projects.length - MAX_PROJECTS));
        return Promise.all(
          projects.slice(0, MAX_PROJECTS).map((project) =>
            getDeliveryProjectSummary(project),
          ),
        );
      })
      .then((result) => {
        setSummaries(result);
        setError(null);
      })
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Could not load delivery"),
      )
      .finally(() => setLoading(false));
  }, [reloadKey]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const totals = useMemo(
    () =>
      summaries.reduce(
        (acc, summary) => ({
          unassigned: acc.unassigned + summary.unassignedTasks,
          inReview: acc.inReview + summary.pendingSubmissions,
          revisions: acc.revisions + summary.openRevisions,
          releases: acc.releases + summary.pendingReleases,
        }),
        { unassigned: 0, inReview: 0, revisions: 0, releases: 0 },
      ),
    [summaries],
  );

  return (
    <DashboardShell
      role="admin"
      title="Delivery"
      subtitle="Implementation progress across every funded project."
    >
      {loading ? (
        <DeliveryLoading label="Loading delivery queues" />
      ) : error ? (
        <DeliveryError message={error} onRetry={refresh} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              label="Tasks unassigned"
              value={totals.unassigned}
              icon={<UserPlus size={18} />}
            />
            <StatsCard
              label="Submissions in review"
              value={totals.inReview}
              icon={<ClipboardCheck size={18} />}
            />
            <StatsCard
              label="Revisions open"
              value={totals.revisions}
              icon={<MessageSquareWarning size={18} />}
            />
            <StatsCard
              label="Releases pending"
              value={totals.releases}
              icon={<CreditCard size={18} />}
            />
          </div>

          {summaries.length === 0 ? (
            <DeliveryEmpty
              title="No projects in delivery"
              description="Projects appear here once their implementation plan is materialised."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
              <div className="admin-responsive-table-wrap">
                <table className="admin-responsive-table text-left text-sm">
                  <thead className="bg-surface-container-low font-medium text-on-surface-variant">
                    <tr>
                      <th className="p-4">Project</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Milestones</th>
                      <th className="p-4 text-right">Tasks</th>
                      <th className="p-4 text-right">Unassigned</th>
                      <th className="p-4 text-right">In review</th>
                      <th className="p-4 text-right">Revisions</th>
                      <th className="p-4 text-right">Held escrow</th>
                      <th className="p-4">Next action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {summaries.map((summary) => (
                      <tr
                        key={summary.project.id}
                        className="hover:bg-surface-container-low/50"
                      >
                        <td data-label="Project" className="p-4 font-semibold">
                          <Link
                            href={`/dashboard/admin/projects/${summary.project.id}`}
                            className="hover:text-primary-container"
                          >
                            {summary.project.title || summary.project.id}
                          </Link>
                        </td>
                        <td data-label="Status" className="p-4">
                          <StatusBadge status={summary.project.status} />
                        </td>
                        <td data-label="Milestones" className="p-4 text-right tabular-nums">
                          {summary.milestoneCount}
                        </td>
                        <td data-label="Tasks" className="p-4 text-right tabular-nums">{summary.taskCount}</td>
                        <td data-label="Unassigned" className="p-4 text-right tabular-nums">
                          {summary.unassignedTasks > 0 ? (
                            <span className="font-semibold text-error">
                              {summary.unassignedTasks}
                            </span>
                          ) : (
                            0
                          )}
                        </td>
                        <td data-label="In review" className="p-4 text-right tabular-nums">
                          {summary.pendingSubmissions}
                        </td>
                        <td data-label="Revisions" className="p-4 text-right tabular-nums">
                          {summary.openRevisions}
                        </td>
                        <td data-label="Held escrow" className="p-4 text-right tabular-nums">
                          {formatMoney(summary.heldEscrow, summary.currency)}
                        </td>
                        <td data-label="Next action" className="p-4 text-on-surface-variant">{summary.nextAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {truncated > 0 && (
            <p className="text-sm text-on-surface-variant">
              Showing the {MAX_PROJECTS} most recent delivery projects. {truncated} more are
              not shown.
            </p>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
