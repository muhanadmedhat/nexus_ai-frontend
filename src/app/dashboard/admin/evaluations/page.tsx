"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getAdminEvaluations,
  type EvaluationRunDetail,
} from "@/services/evaluations";

const STATUS_FILTERS = [
  "all",
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

// StatusBadge styles `approved`/`changes_requested`/`under_review`; map the
// recommendation values onto those so they render with a color.
function recommendationBadge(recommendation: string | null): string | null {
  if (!recommendation) return null;
  if (recommendation === "approve") return "approved";
  if (recommendation === "needs_review") return "under_review";
  return recommendation;
}

export default function AdminEvaluationsQueue() {
  const [runs, setRuns] = useState<EvaluationRunDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");

  const load = useCallback(() => {
    return getAdminEvaluations({
      limit: 100,
      status: status === "all" ? undefined : status,
    })
      .then((res) => {
        setRuns(res.data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Could not load evaluations",
        );
        setRuns([]);
      })
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell
      role="admin"
      title="Evaluations"
      subtitle="AI evaluation runs for freelancer submissions."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setStatus(item);
              setLoading(true);
            }}
            className={`rounded-full border px-4 py-1.5 text-sm capitalize transition ${
              status === item
                ? "border-primary bg-primary-container/15 text-primary-container"
                : "border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          {error}
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center text-on-surface-variant">
          No evaluation runs found.
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-low text-on-surface-variant font-medium">
                <tr>
                  <th className="p-4">Submission</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Recommendation</th>
                  <th className="p-4">Review</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {runs.map((run) => {
                  const recommendation = recommendationBadge(run.recommendation);
                  return (
                    <tr key={run.id} className="hover:bg-surface-container-low/50">
                      <td className="p-4 font-mono text-xs">
                        {run.submissionId?.slice(0, 8) ?? "—"}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="p-4">{run.score ?? "—"}</td>
                      <td className="p-4">
                        {recommendation ? (
                          <StatusBadge status={recommendation} />
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {run.requiresHumanReview ? (
                          <span className="text-secondary">Needs review</span>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Link href={`/dashboard/admin/evaluations/${run.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
