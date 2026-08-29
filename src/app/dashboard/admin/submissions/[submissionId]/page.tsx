"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  MessageSquareWarning,
  XCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EvidenceList } from "@/components/delivery";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  getDeliverySubmission,
  reviewDeliverySubmission,
  type SubmissionDetail,
} from "@/services/project-submissions";
import type {
  EvaluationRubricItem,
  ProjectSubmissionReview,
  SubmissionCriterionReview,
} from "@/types/delivery";

type CriterionInput = {
  key: string;
  criterion: string;
  rating: number | null;
  comment: string;
};

function applicableCriteria(detail: SubmissionDetail) {
  const canonical = detail.reviewRequirements?.criteria ?? [];
  if (canonical.length) {
    return canonical.map(({ criterionKey, criterion }) => ({
      key: criterionKey,
      criterion,
    }));
  }
  const evaluation = detail.latestEvaluationRun ?? detail.evaluationRun;
  const coverage = evaluation?.acceptanceCoverage;
  if (!coverage) return [];
  const completed = Array.isArray(coverage.items) ? coverage.items : [];
  const snapshot = Array.isArray(coverage.rubricSnapshot?.criteria)
    ? coverage.rubricSnapshot.criteria
    : [];
  const source = completed.length > 0 ? completed : snapshot;
  const seen = new Set<string>();
  return source.flatMap((item, index) => {
    if (completed.length > 0 && item.status === "not_applicable") return [];
    const criterion = item.criterion?.trim();
    if (!criterion) return [];
    const key = item.key?.trim() || `criterion_${index + 1}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ key, criterion }];
  });
}

function storedCriteria(
  review: ProjectSubmissionReview | undefined,
): SubmissionCriterionReview[] {
  const value = review?.metadata?.criteriaReviews;
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    if (
      typeof item.criterionKey !== "string" ||
      typeof item.criterion !== "string" ||
      typeof item.rating !== "number"
    ) {
      return [];
    }
    return [
      {
        criterionKey: item.criterionKey,
        criterion: item.criterion,
        rating: item.rating,
        comment: typeof item.comment === "string" ? item.comment : null,
      },
    ];
  });
}

function Rubric({ items }: { items: EvaluationRubricItem[] }) {
  if (items.length === 0) return null;
  return (
    <ol className="mt-3 space-y-2">
      {items.map((item, index) => (
        <li
          key={item.key ?? `${index}-${item.criterion}`}
          className="rounded-lg bg-surface-container-lowest p-3 text-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-medium text-on-surface">
              {index + 1}. {item.criterion}
            </span>
            <StatusBadge status={item.status ?? (item.met ? "met" : "unmet")} />
          </div>
          {item.evidence && (
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">
              Evidence: {item.evidence}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

function SavedReview({ review }: { review: ProjectSubmissionReview }) {
  const criteria = storedCriteria(review);
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-headline text-xl font-semibold text-on-surface">
          Recorded human review
        </h2>
        <StatusBadge status={review.decision} />
        {review.score && (
          <span className="text-sm font-semibold text-on-surface">
            {Math.round(Number(review.score))}/100
          </span>
        )}
      </div>
      {review.feedback && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
          <span className="font-medium text-on-surface">
            General comments:{" "}
          </span>
          {review.feedback}
        </p>
      )}
      {criteria.length > 0 && (
        <ol className="mt-4 space-y-2">
          {criteria.map((item, index) => (
            <li
              key={item.criterionKey}
              className="rounded-lg bg-surface-container-low p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium text-on-surface">
                  {index + 1}. {item.criterion}
                </span>
                <span className="shrink-0 font-semibold text-primary-container">
                  {item.rating}/5
                </span>
              </div>
              {item.comment && (
                <p className="mt-1 whitespace-pre-wrap text-on-surface-variant">
                  {item.comment}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function AdminSubmissionReviewPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const toast = useToast();
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [criteria, setCriteria] = useState<Record<string, CriterionInput>>({});
  const [manualReviewAcknowledged, setManualReviewAcknowledged] =
    useState(false);
  const [deciding, setDeciding] = useState<
    "approve" | "revise" | "reject" | null
  >(null);

  const load = useCallback(async () => {
    if (!submissionId) return;
    try {
      const next = await getDeliverySubmission(submissionId);
      setDetail(next);
      setCriteria((current) =>
        Object.fromEntries(
          applicableCriteria(next).map(({ key, criterion }) => [
            key,
            current[key]?.criterion === criterion
              ? current[key]
              : { key, criterion, rating: null, comment: "" },
          ]),
        ),
      );
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load submission.",
      );
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  useEffect(() => {
    if (!detail || !["submitted", "under_review"].includes(detail.status)) {
      return;
    }
    const evaluation = detail.latestEvaluationRun ?? detail.evaluationRun;
    if (evaluation?.status === "completed") return;
    const interval = window.setInterval(() => void load(), 3_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [detail, load]);

  const rubricCriteria = useMemo(
    () => (detail ? applicableCriteria(detail) : []),
    [detail],
  );
  const allRated = rubricCriteria.every(({ key }) => {
    const rating = criteria[key]?.rating;
    return typeof rating === "number" && rating >= 1 && rating <= 5;
  });
  const evaluation = detail?.latestEvaluationRun ?? detail?.evaluationRun;
  const canDecide = Boolean(
    detail && ["submitted", "under_review"].includes(detail.status),
  );
  const commitMatches = Boolean(
    detail &&
    (!["pull_request", "repository"].includes(detail.submissionType) ||
      (detail.commitSha &&
        evaluation?.evaluatedCommitSha &&
        detail.commitSha.toLowerCase() ===
          evaluation.evaluatedCommitSha.toLowerCase())),
  );
  const approvalReady = Boolean(
    allRated &&
    evaluation?.status === "completed" &&
    commitMatches &&
    ["approve", "manual_review"].includes(evaluation.recommendation ?? "") &&
    (evaluation.recommendation !== "manual_review" ||
      (manualReviewAcknowledged && feedback.trim().length >= 20)),
  );
  const average = rubricCriteria.length
    ? rubricCriteria.reduce(
        (sum, { key }) => sum + (criteria[key]?.rating ?? 0),
        0,
      ) / rubricCriteria.length
    : null;

  const decide = async (
    decision: "approved" | "changes_requested" | "rejected",
  ) => {
    if (!detail) return;
    if (!allRated) {
      toast.error(
        "Rate every criterion",
        "Every applicable item needs a 1–5 rating.",
      );
      return;
    }
    if (decision !== "approved" && !feedback.trim()) {
      toast.error(
        "General comments required",
        "Give the freelancer a clear reason for this decision.",
      );
      return;
    }
    if (decision === "approved" && !approvalReady) {
      toast.error(
        "Approval is locked",
        "Wait for a matching completed evaluation and complete any manual-review evidence.",
      );
      return;
    }

    const reviews = rubricCriteria.map(({ key }) => ({
      criterionKey: key,
      rating: criteria[key].rating as number,
      comment: criteria[key].comment.trim() || undefined,
    }));
    const requestedItems = reviews
      .filter((item) => item.rating <= 2 || item.comment)
      .map((item) => ({
        area:
          rubricCriteria.find(({ key }) => key === item.criterionKey)
            ?.criterion ?? item.criterionKey,
        comment: item.comment ?? `This criterion received ${item.rating}/5.`,
      }));
    setDeciding(
      decision === "approved"
        ? "approve"
        : decision === "rejected"
          ? "reject"
          : "revise",
    );
    try {
      await reviewDeliverySubmission(detail.id, {
        decision,
        feedback: feedback.trim() || undefined,
        criteriaReviews: reviews,
        requestedChanges:
          decision !== "approved" && requestedItems.length > 0
            ? { items: requestedItems }
            : undefined,
        createRevisionRequest: decision === "changes_requested",
        manualReviewAcknowledged:
          decision === "approved" && manualReviewAcknowledged,
      });
      toast.success(
        decision === "approved"
          ? "Submission approved"
          : decision === "rejected"
            ? "Submission rejected"
            : "Revision requested",
        "The freelancer has been notified with the review reason.",
      );
      await load();
    } catch (reviewError) {
      toast.error(
        "Could not save review",
        reviewError instanceof Error
          ? reviewError.message
          : "Please try again.",
      );
    } finally {
      setDeciding(null);
    }
  };

  const displayedRubric = evaluation?.acceptanceCoverage?.items?.length
    ? evaluation.acceptanceCoverage.items
    : (evaluation?.acceptanceCoverage?.rubricSnapshot?.criteria ?? []);

  return (
    <DashboardShell
      role="admin"
      title="Submission review"
      subtitle="Inspect the evidence, score every criterion, and record an actionable verdict."
    >
      <Link
        href={
          detail?.projectId
            ? `/dashboard/admin/projects/${detail.projectId}`
            : "/dashboard/admin/projects"
        }
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary-container"
      >
        <ArrowLeft size={16} /> Back to project workspace
      </Link>

      {loading && !detail ? (
        <p className="text-sm text-on-surface-variant">Loading submission...</p>
      ) : !detail ? (
        <div className="rounded-xl border border-error/30 bg-error/5 p-5 text-sm text-error">
          {error ?? "Submission not found."}
        </div>
      ) : (
        <div className="space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error"
            >
              Live refresh failed: {error}. The last loaded submission remains
              visible.
            </div>
          )}
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                  Version {detail.version}
                </p>
                <h2 className="mt-1 font-headline text-2xl font-semibold text-on-surface">
                  {detail.title || "Submitted work"}
                </h2>
              </div>
              <StatusBadge status={detail.status} />
            </div>
            {detail.summary && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
                {detail.summary}
              </p>
            )}
            <div className="mt-4">
              <EvidenceList submission={detail} />
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-headline text-xl font-semibold text-on-surface">
                Automated evaluation
              </h2>
              <StatusBadge status={evaluation?.status ?? "queued"} />
              {evaluation?.score && (
                <span className="text-sm font-semibold text-on-surface">
                  {Math.round(Number(evaluation.score))}/100
                </span>
              )}
              {evaluation?.id && (
                <Link
                  href={`/dashboard/admin/evaluations/${evaluation.id}`}
                  className="text-sm font-semibold text-primary-container hover:underline"
                >
                  Open full evaluation
                </Link>
              )}
            </div>
            {evaluation?.summary && (
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                {evaluation.summary}
              </p>
            )}
            <Rubric items={displayedRubric} />
          </section>

          {detail.reviews?.[0] && <SavedReview review={detail.reviews[0]} />}

          {canDecide && (
            <section className="rounded-xl border border-primary-container/35 bg-surface-container-lowest p-6 card-shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-headline text-xl font-semibold text-on-surface">
                    Human criterion review
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Every applicable criterion must be rated before a decision.
                  </p>
                </div>
                {average !== null && allRated && (
                  <span className="rounded-full bg-primary-container/10 px-3 py-1 text-sm font-semibold text-primary-container">
                    Average {average.toFixed(1)}/5
                  </span>
                )}
              </div>

              {rubricCriteria.length > 0 && (
                <ol className="mt-5 space-y-4">
                  {rubricCriteria.map(({ key, criterion }, index) => {
                    const input = criteria[key] ?? {
                      key,
                      criterion,
                      rating: null,
                      comment: "",
                    };
                    return (
                      <li
                        key={key}
                        className="rounded-lg bg-surface-container-low p-4"
                      >
                        <p className="text-sm font-medium leading-6 text-on-surface">
                          {index + 1}. {criterion}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              aria-pressed={input.rating === rating}
                              onClick={() =>
                                setCriteria((current) => ({
                                  ...current,
                                  [key]: { ...input, rating },
                                }))
                              }
                              className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                                input.rating === rating
                                  ? "border-primary-container bg-primary-container text-on-primary"
                                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary-container hover:text-primary-container"
                              }`}
                            >
                              {rating}/5
                            </button>
                          ))}
                        </div>
                        <label
                          htmlFor={`admin-criterion-${key}`}
                          className="mt-3 block text-xs font-medium text-on-surface-variant"
                        >
                          Criterion comment (optional)
                        </label>
                        <textarea
                          id={`admin-criterion-${key}`}
                          rows={2}
                          maxLength={4000}
                          value={input.comment}
                          onChange={(event) =>
                            setCriteria((current) => ({
                              ...current,
                              [key]: { ...input, comment: event.target.value },
                            }))
                          }
                          placeholder="Evidence, issue, or specific next step."
                          className="input-halo mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none transition-all placeholder:text-outline/50"
                        />
                      </li>
                    );
                  })}
                </ol>
              )}

              <label
                htmlFor="admin-general-comments"
                className="mt-5 block text-sm font-medium text-on-surface"
              >
                General comments
              </label>
              <textarea
                id="admin-general-comments"
                rows={4}
                maxLength={12000}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Summarize the verdict. Required for revisions, rejection, and manual-review approvals."
                className="input-halo mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-all placeholder:text-outline/50"
              />

              {evaluation?.recommendation === "manual_review" && (
                <label className="mt-4 flex items-start gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-low p-3 text-sm text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={manualReviewAcknowledged}
                    onChange={(event) =>
                      setManualReviewAcknowledged(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    I inspected the exact commit, diff, and verification
                    evidence. The general comments record that evidence.
                  </span>
                </label>
              )}

              {!approvalReady && (
                <p className="mt-4 text-sm text-on-surface-variant">
                  Approval unlocks after a matching completed evaluation allows
                  approval and every criterion is rated.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  size="sm"
                  onClick={() => void decide("approved")}
                  loading={deciding === "approve"}
                  disabled={deciding !== null || !approvalReady}
                >
                  <CheckCircle size={15} /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void decide("changes_requested")}
                  loading={deciding === "revise"}
                  disabled={deciding !== null || !allRated}
                >
                  <MessageSquareWarning size={15} /> Request changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void decide("rejected")}
                  loading={deciding === "reject"}
                  disabled={deciding !== null || !allRated}
                >
                  <XCircle size={15} /> Reject version
                </Button>
              </div>
            </section>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
