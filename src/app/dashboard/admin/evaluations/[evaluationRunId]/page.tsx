"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  getEvaluationRun,
  retryEvaluationRun,
  type EvaluationRunDetail,
} from "@/services/evaluations";

const RETRYABLE_STATUSES = new Set(["failed", "cancelled", "completed"]);

export default function AdminEvaluationDetail() {
  const { evaluationRunId } = useParams<{ evaluationRunId: string }>();
  const toast = useToast();
  const [run, setRun] = useState<EvaluationRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(() => {
    if (!evaluationRunId) return Promise.resolve();
    return getEvaluationRun(evaluationRunId)
      .then((detail) => setRun(detail))
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Could not load evaluation";
        toast.error("Could not load evaluation", message);
      })
      .finally(() => setLoading(false));
  }, [evaluationRunId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retry() {
    if (!evaluationRunId) return;
    setRetrying(true);
    try {
      await retryEvaluationRun(evaluationRunId, {
        reason: "admin_manual_retry",
      });
      toast.success(
        "Evaluation re-queued",
        "The submission will be evaluated again.",
      );
      await load();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not retry evaluation";
      toast.error("Retry failed", message);
    } finally {
      setRetrying(false);
    }
  }

  const rubric = run?.acceptanceCoverage?.items ?? [];

  return (
    <DashboardShell
      role="admin"
      title="Evaluation Run"
      subtitle="AI evaluation of a freelancer submission."
    >
      <Link
        href="/dashboard/admin/evaluations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to queue
      </Link>

      {loading ? (
        <p>Loading...</p>
      ) : !run ? (
        <p>Evaluation run not found.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <div className="flex flex-col gap-3 border-b border-outline-variant/20 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Submission {run.submissionId?.slice(0, 8) ?? "—"}
                </p>
                <h3 className="mt-2 font-headline text-xl font-semibold text-on-surface">
                  {run.score != null ? `Score ${run.score}` : "Not scored yet"}
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {run.requiresHumanReview
                    ? "Flagged for human review."
                    : "Automated evaluation."}
                </p>
              </div>
              <StatusBadge status={run.status} />
            </div>

            <section className="mt-5">
              <h4 className="font-semibold text-on-surface">Feedback</h4>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {run.summary || "No feedback recorded yet."}
              </p>
            </section>

            {run.acceptanceCoverage && (
              <section className="mt-5">
                <h4 className="font-semibold text-on-surface">
                  Acceptance criteria ({run.acceptanceCoverage.met}/
                  {run.acceptanceCoverage.total} met)
                </h4>
                <ul className="mt-3 space-y-2">
                  {rubric.map((item, index) => (
                    <li
                      key={index}
                      className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-3"
                    >
                      <div className="flex items-start gap-2">
                        {item.met ? (
                          <CheckCircle2
                            size={18}
                            className="mt-0.5 shrink-0 text-primary-container"
                          />
                        ) : (
                          <XCircle
                            size={18}
                            className="mt-0.5 shrink-0 text-error"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-on-surface">
                            {item.criterion}
                          </p>
                          {item.evidence && (
                            <p className="mt-1 text-xs text-on-surface-variant">
                              {item.evidence}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {run.riskFlags && run.riskFlags.length > 0 && (
              <section className="mt-5">
                <h4 className="font-semibold text-on-surface">Risk flags</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {run.riskFlags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full bg-error/10 px-3 py-1 text-xs text-error"
                    >
                      {flag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {run.error && (
              <section className="mt-5">
                <h4 className="font-semibold text-error">Error</h4>
                <p className="mt-2 text-sm text-error">{run.error}</p>
              </section>
            )}
          </div>

          <aside className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow lg:sticky lg:top-24 lg:self-start">
            <h4 className="font-headline text-lg font-semibold text-on-surface">
              Run details
            </h4>
            <dl className="mt-4 space-y-2 text-sm">
              <MetaRow
                label="Recommendation"
                value={run.recommendation ?? "—"}
              />
              <MetaRow label="Model" value={run.modelName ?? "—"} />
              <MetaRow label="Prompt" value={run.promptVersion ?? "—"} />
              <MetaRow
                label="Created"
                value={new Date(run.createdAt).toLocaleString()}
              />
              <MetaRow
                label="Completed"
                value={
                  run.completedAt
                    ? new Date(run.completedAt).toLocaleString()
                    : "—"
                }
              />
            </dl>

            <div className="mt-5 grid gap-2">
              <Button
                type="button"
                loading={retrying}
                disabled={!RETRYABLE_STATUSES.has(run.status)}
                onClick={retry}
              >
                <RefreshCw size={16} /> Re-run evaluation
              </Button>
            </div>
          </aside>
        </div>
      )}
    </DashboardShell>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="truncate font-medium text-on-surface">{value}</dd>
    </div>
  );
}
