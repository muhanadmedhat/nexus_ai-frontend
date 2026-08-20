"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  getReviewerOverview,
  getReviewerHandoff,
  getReviewerPlanningSubmissions,
  getReviewerPlans,
  getReviewerReleaseRequests,
  getReviewerSubmission,
  getReviewerSubmissions,
  reviewReviewerPlan,
  reviewReviewerPlanningSubmission,
  reviewReviewerRelease,
  reviewReviewerHandoff,
  reviewReviewerSubmission,
} from "@/services/reviewer";

type Row = Record<string, unknown>;
type Criterion = { key: string; criterion: string };

const text = (value: unknown) => (typeof value === "string" ? value : "");

export default function ReviewerProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();
  const [overview, setOverview] = useState<Row | null>(null);
  const [planning, setPlanning] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Row[]>([]);
  const [submissions, setSubmissions] = useState<Row[]>([]);
  const [releases, setReleases] = useState<Row[]>([]);
  const [handoff, setHandoff] = useState<Row | null>(null);
  const [handoffTaskId, setHandoffTaskId] = useState("");
  const [handoffSummary, setHandoffSummary] = useState("");
  const [handoffLiveUrl, setHandoffLiveUrl] = useState("");
  const [handoffArtifactUrls, setHandoffArtifactUrls] = useState("");
  const [handoffFeedback, setHandoffFeedback] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<Row | null>(
    null,
  );
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        overviewResult,
        planningResult,
        plansResult,
        submissionsResult,
        releasesResult,
        handoffResult,
      ] = await Promise.all([
        getReviewerOverview(projectId),
        getReviewerPlanningSubmissions(projectId),
        getReviewerPlans(projectId),
        getReviewerSubmissions(projectId),
        getReviewerReleaseRequests(projectId),
        getReviewerHandoff(projectId),
      ]);
      setOverview(overviewResult);
      setPlanning(planningResult);
      setPlans(plansResult);
      setSubmissions(submissionsResult);
      setReleases(releasesResult);
      setHandoff(handoffResult);
      setHandoffSummary(
        handoffResult?.reviewerApprovedAt ? text(handoffResult.summary) : '',
      );
      setHandoffLiveUrl(text(handoffResult?.liveUrl));
      setHandoffArtifactUrls(
        Array.isArray(handoffResult?.artifactUrls)
          ? handoffResult.artifactUrls.filter((item): item is string => typeof item === "string").join("\n")
          : "",
      );
    } catch (error) {
      toast.error(
        "Could not load reviewer workbench",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const live = () => void load();
    window.addEventListener("nexus:notification", live);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("nexus:notification", live);
    };
  }, [load]);

  const project = (overview?.project ?? {}) as Row;
  const attention = (overview?.attention ?? {}) as Row;
  const criteria = useMemo(
    () => submissionCriteria(selectedSubmission),
    [selectedSubmission],
  );

  const decidePlanning = async (
    item: Row,
    status: "approved" | "changes_requested" | "rejected",
  ) => {
    const notes =
      status === "approved"
        ? ""
        : (window.prompt("Explain the decision to the freelancer")?.trim() ??
          "");
    if (status !== "approved" && !notes) return;
    const recommendation = text(item.evaluationRecommendation);
    let aiOverrideReason = "";
    if (status === "approved" && recommendation !== "approve") {
      aiOverrideReason =
        window
          .prompt(
            "The AI did not recommend approval. Enter at least 20 characters of override evidence:",
          )
          ?.trim() ?? "";
      if (aiOverrideReason.length < 20) return;
    }
    await act(text(item.id), () =>
      reviewReviewerPlanningSubmission(text(item.id), {
        status,
        adminNotes: notes || undefined,
        aiOverride: Boolean(aiOverrideReason),
        aiOverrideReason: aiOverrideReason || undefined,
      }),
    );
  };

  const decidePlan = async (
    item: Row,
    status: "approved" | "changes_requested" | "rejected",
  ) => {
    const notes =
      status === "approved"
        ? ""
        : (window.prompt("Explain what must change")?.trim() ?? "");
    if (status !== "approved" && !notes) return;
    await act(text(item.id), () =>
      reviewReviewerPlan(text(item.id), {
        status,
        adminNotes: notes || undefined,
        materialize: status === "approved",
      }),
    );
  };

  const openSubmission = async (item: Row) => {
    setWorking(text(item.id));
    try {
      const detail = await getReviewerSubmission(text(item.id));
      setSelectedSubmission(detail);
      setRatings({});
      setComments({});
    } catch (error) {
      toast.error(
        "Could not load submission",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setWorking(null);
    }
  };

  const decideSubmission = async (
    decision: "approved" | "changes_requested" | "rejected",
  ) => {
    if (!selectedSubmission) return;
    const feedback =
      window
        .prompt(
          decision === "approved"
            ? "Optional overall comments"
            : "Explain the requested changes or rejection",
        )
        ?.trim() ?? "";
    if (decision !== "approved" && !feedback) return;
    if (
      decision === "approved" &&
      criteria.some((criterion) => !ratings[criterion.key])
    ) {
      toast.error(
        "Rate every criterion",
        "Each applicable criterion needs a rating from 1 to 5.",
      );
      return;
    }
    const evaluation = latestEvaluation(selectedSubmission);
    const manualReview = text(evaluation?.recommendation) === "manual_review";
    if (manualReview && feedback.length < 20) {
      toast.error(
        "Manual review evidence required",
        "Add at least 20 characters explaining your verification.",
      );
      return;
    }
    await act(text(selectedSubmission.id), () =>
      reviewReviewerSubmission(text(selectedSubmission.id), {
        decision,
        feedback: feedback || undefined,
        createRevisionRequest: decision === "changes_requested",
        manualReviewAcknowledged: manualReview,
        criteriaReviews:
          decision === "approved"
            ? criteria.map((criterion) => ({
                criterionKey: criterion.key,
                rating: ratings[criterion.key],
                comment: comments[criterion.key]?.trim() || undefined,
              }))
            : undefined,
      }),
    );
    setSelectedSubmission(null);
  };

  const decideRelease = async (
    item: Row,
    decision: "approved" | "rejected",
  ) => {
    const notes =
      window
        .prompt(
          decision === "approved"
            ? "Optional payment note"
            : "Reason for rejecting the release",
        )
        ?.trim() ?? "";
    if (decision === "rejected" && !notes) return;
    await act(text(item.id), () =>
      reviewReviewerRelease(text(item.id), {
        decision,
        reviewNotes: notes || undefined,
        releaseNow: decision === "approved",
      }),
    );
  };

  const decideHandoff = async (
    decision: "approved" | "changes_requested",
  ) => {
    if (!handoff) return;
    if (decision === "changes_requested" && (!handoffTaskId || !handoffFeedback.trim())) {
      toast.error(
        "Route the revision",
        "Choose the responsible task and give actionable feedback.",
      );
      return;
    }
    const artifactUrls = handoffArtifactUrls
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);
    if (
      decision === "approved" &&
      (handoffSummary.trim().length < 20 ||
        (!handoffLiveUrl.trim() && artifactUrls.length === 0))
    ) {
      toast.error(
        "Complete the client handoff",
        "Add a useful summary and at least one client-accessible live or artifact URL.",
      );
      return;
    }
    const report = (handoff.verificationReport ?? {}) as Row;
    const manualReview = text(report.recommendation) === "manual_review";
    if (decision === "approved" && manualReview && handoffFeedback.trim().length < 20) {
      toast.error(
        "Manual review evidence required",
        "Record at least 20 characters describing what you verified.",
      );
      return;
    }
    await act(`handoff:${text(handoff.id)}`, () =>
      reviewReviewerHandoff(projectId, {
        decision,
        taskId: decision === "changes_requested" ? handoffTaskId : undefined,
        feedback: handoffFeedback.trim() || undefined,
        summary: decision === "approved" ? handoffSummary.trim() || undefined : undefined,
        liveUrl: decision === "approved" ? handoffLiveUrl.trim() || undefined : undefined,
        artifactUrls:
          decision === "approved"
            ? artifactUrls
            : undefined,
        manualReviewAcknowledged: decision === "approved" && manualReview,
      }),
    );
  };

  const act = async (id: string, operation: () => Promise<unknown>) => {
    setWorking(id);
    try {
      await operation();
      toast.success(
        "Decision saved",
        "The freelancer and project stakeholders were notified.",
      );
      await load();
    } catch (error) {
      toast.error(
        "Could not save decision",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setWorking(null);
    }
  };

  return (
    <DashboardShell
      role="freelancer"
      title={text(project.title) || "Reviewer workbench"}
      subtitle="Validate AI output and unblock the project without routine admin involvement."
    >
      <Link
        href="/reviewer"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary-container"
      >
        <ArrowLeft size={16} /> Reviewer projects
      </Link>
      {loading ? (
        <div className="flex justify-center py-20 text-on-surface-variant">
          <Loader2 className="mr-2 animate-spin" /> Loading workbench…
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {Object.entries(attention).map(([key, value]) => (
              <div
                key={key}
                className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4"
              >
                <p className="text-2xl font-semibold text-on-surface">
                  {String(value)}
                </p>
                <p className="mt-1 text-xs capitalize text-on-surface-variant">
                  {key.replace(/([A-Z])/g, " $1")}
                </p>
              </div>
            ))}
          </div>

          <Queue
            title="Planning deliverables"
            empty="No planning submissions awaiting a decision."
          >
            {planning
              .filter((item) => text(item.status) === "submitted")
              .map((item) => (
                <ReviewRow
                  key={text(item.id)}
                  title={text(item.title) || text(item.submissionType)}
                  status={text(item.evaluationStatus) || text(item.status)}
                  detail={`AI: ${text(item.evaluationRecommendation) || "pending"}${item.evaluationScore != null ? ` · ${String(item.evaluationScore)}/100` : ""}`}
                  working={working === item.id}
                  onApprove={() => void decidePlanning(item, "approved")}
                  onChanges={() =>
                    void decidePlanning(item, "changes_requested")
                  }
                />
              ))}
          </Queue>

          <Queue
            title="Generated Scrum plans"
            empty="No generated plan awaits approval."
          >
            {plans
              .filter((item) => text(item.status) === "generated")
              .map((item) => (
                <ReviewRow
                  key={text(item.id)}
                  title={`Plan v${String(item.version ?? "")}`}
                  status={text(item.status)}
                  detail={text(item.summary)}
                  working={working === item.id}
                  onApprove={() => void decidePlan(item, "approved")}
                  onChanges={() => void decidePlan(item, "changes_requested")}
                  approveLabel="Approve and start matching"
                />
              ))}
          </Queue>

          <Queue
            title="Developer submissions"
            empty="No implementation work awaits review."
          >
            {submissions
              .filter((item) =>
                ["submitted", "under_review"].includes(text(item.status)),
              )
              .map((item) => (
                <div
                  key={text(item.id)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low p-4"
                >
                  <div>
                    <p className="font-medium text-on-surface">
                      {text(item.title) || "Implementation submission"}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {text(item.summary)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={working === item.id}
                    onClick={() => void openSubmission(item)}
                  >
                    Inspect and review
                  </Button>
                </div>
              ))}
          </Queue>

          <Queue
            title="Payment exceptions"
            empty="Accepted work is releasing automatically. No payment exceptions need attention."
          >
            {releases
              .filter((item) =>
                ["pending", "approved"].includes(text(item.status)),
              )
              .map((item) => (
                <ReviewRow
                  key={text(item.id)}
                  title={`${String(item.amount)} ${text(item.currency)}`}
                  status={text(item.status)}
                  detail={text(item.reason)}
                  working={working === item.id}
                  onApprove={() => void decideRelease(item, "approved")}
                  onChanges={() => void decideRelease(item, "rejected")}
                  approveLabel="Approve and release"
                  changesLabel="Reject"
                />
              ))}
          </Queue>

          <Queue
            title="Final integration and client handoff"
            empty="Final integration starts after every implementation task is approved."
          >
            {handoff && (
              <div className="space-y-4 rounded-lg bg-surface-container-low p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-on-surface">
                      {text(handoff.summary) || "Integrated project delivery"}
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {text(handoff.integrationBranch)}
                      {handoff.integrationCommitSha
                        ? ` · ${text(handoff.integrationCommitSha).slice(0, 12)}`
                        : " · commit pending"}
                    </p>
                  </div>
                  <StatusBadge status={text(handoff.status)} />
                </div>
                {Boolean(handoff.lastError) && (
                  <p className="rounded-lg bg-error/10 p-3 text-sm text-error">
                    {text(handoff.lastError)}
                  </p>
                )}
                {Boolean(handoff.verificationReport) && (
                  <p className="text-sm text-on-surface-variant">
                    Final AI verification: {text((handoff.verificationReport as Row).recommendation).replace(/_/g, " ") || "pending"}
                    {(handoff.verificationReport as Row).score != null
                      ? ` · ${String((handoff.verificationReport as Row).score)}/100`
                      : ""}
                  </p>
                )}
                {text(handoff.status) === "reviewer_review" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-on-surface-variant">
                      Client-facing summary
                      <textarea value={handoffSummary} onChange={(event) => setHandoffSummary(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface" />
                    </label>
                    <label className="text-sm text-on-surface-variant">
                      Live URL (required unless an artifact is provided)
                      <input value={handoffLiveUrl} onChange={(event) => setHandoffLiveUrl(event.target.value)} placeholder="https://..." className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface" />
                    </label>
                    <label className="text-sm text-on-surface-variant sm:col-span-2">
                      Artifact or documentation URLs (one per line; required unless a live URL is provided)
                      <textarea value={handoffArtifactUrls} onChange={(event) => setHandoffArtifactUrls(event.target.value)} rows={2} placeholder="https://..." className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface" />
                    </label>
                  </div>
                )}
                {["reviewer_review", "verification_failed", "client_changes_requested"].includes(text(handoff.status)) && (
                  <label className="block text-sm text-on-surface-variant">
                    Review evidence or revision feedback
                    <textarea value={handoffFeedback} onChange={(event) => setHandoffFeedback(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface" />
                  </label>
                )}
                {["verification_failed", "reviewer_review", "client_changes_requested"].includes(text(handoff.status)) && (
                  <label className="block text-sm text-on-surface-variant">
                    Responsible task for a revision
                    <select value={handoffTaskId} onChange={(event) => setHandoffTaskId(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface">
                      <option value="">Choose task</option>
                      {submissions
                        .filter((item) => text(item.status) === "approved" && text(item.taskId))
                        .map((item) => (
                          <option key={text(item.taskId)} value={text(item.taskId)}>
                            {text(item.title) || text(item.taskId)}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <div className="flex flex-wrap gap-3">
                  {text(handoff.status) === "reviewer_review" && (
                    <Button loading={working === `handoff:${text(handoff.id)}`} disabled={working !== null} onClick={() => void decideHandoff("approved")}>
                      <CheckCircle2 size={16} /> Send verified delivery to client
                    </Button>
                  )}
                  {["verification_failed", "reviewer_review", "client_changes_requested"].includes(text(handoff.status)) && (
                    <Button variant="outline" loading={working === `handoff:${text(handoff.id)}`} disabled={working !== null} onClick={() => void decideHandoff("changes_requested")}>
                      <RefreshCw size={16} /> Route final revision
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Queue>

          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw size={16} /> Refresh all queues
          </Button>
        </div>
      )}

      {selectedSubmission && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface-container-lowest p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                  Implementation review
                </p>
                <h2 className="mt-1 text-xl font-semibold text-on-surface">
                  {text(selectedSubmission.title) || "Submission"}
                </h2>
              </div>
              <StatusBadge status={text(selectedSubmission.status)} />
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-on-surface-variant">
              {text(selectedSubmission.summary)}
            </p>
            <div className="mt-5 space-y-3">
              {criteria.map((criterion, index) => (
                <div
                  key={criterion.key}
                  className="rounded-lg border border-outline-variant/30 p-4"
                >
                  <p className="text-sm font-medium text-on-surface">
                    {index + 1}. {criterion.criterion}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <select
                      value={ratings[criterion.key] ?? ""}
                      onChange={(event) =>
                        setRatings((current) => ({
                          ...current,
                          [criterion.key]: Number(event.target.value),
                        }))
                      }
                      className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
                    >
                      <option value="">Rating</option>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating}/5
                        </option>
                      ))}
                    </select>
                    <input
                      value={comments[criterion.key] ?? ""}
                      onChange={(event) =>
                        setComments((current) => ({
                          ...current,
                          [criterion.key]: event.target.value,
                        }))
                      }
                      placeholder="Criterion comment (optional)"
                      className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}
              {criteria.length === 0 && (
                <p className="rounded-lg bg-warning/10 p-3 text-sm text-on-surface-variant">
                  This evaluation has no applicable rubric rows. You can still
                  request changes or reject it; approval remains subject to
                  backend evaluation policy.
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => void decideSubmission("approved")}>
                <CheckCircle2 size={16} /> Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => void decideSubmission("changes_requested")}
              >
                <RefreshCw size={16} /> Request changes
              </Button>
              <Button
                variant="outline"
                onClick={() => void decideSubmission("rejected")}
              >
                <XCircle size={16} /> Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Queue({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children;
  const hasRows = Array.isArray(rows) ? rows.length > 0 : Boolean(rows);
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
      <h2 className="font-headline text-lg font-semibold text-on-surface">
        {title}
      </h2>
      <div className="mt-4 space-y-3">
        {hasRows ? (
          rows
        ) : (
          <p className="rounded-lg border border-dashed border-outline-variant p-5 text-sm text-on-surface-variant">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}

function ReviewRow({
  title,
  status,
  detail,
  working,
  onApprove,
  onChanges,
  approveLabel = "Approve",
  changesLabel = "Request changes",
}: {
  title: string;
  status: string;
  detail: string;
  working: boolean;
  onApprove: () => void;
  onChanges: () => void;
  approveLabel?: string;
  changesLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-container-low p-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-on-surface">{title}</p>
          <StatusBadge status={status} />
        </div>
        {detail && (
          <p className="mt-1 max-w-3xl text-sm text-on-surface-variant">
            {detail}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" loading={working} onClick={onApprove}>
          {approveLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={working}
          onClick={onChanges}
        >
          {changesLabel}
        </Button>
      </div>
    </div>
  );
}

function latestEvaluation(submission: Row | null): Row | null {
  if (!submission) return null;
  if (
    submission.latestEvaluationRun &&
    typeof submission.latestEvaluationRun === "object"
  )
    return submission.latestEvaluationRun as Row;
  if (submission.evaluationRun && typeof submission.evaluationRun === "object")
    return submission.evaluationRun as Row;
  const runs = Array.isArray(submission.evaluationRuns)
    ? (submission.evaluationRuns as Row[])
    : [];
  return (
    runs.sort((left, right) =>
      text(right.createdAt).localeCompare(text(left.createdAt)),
    )[0] ?? null
  );
}

function submissionCriteria(submission: Row | null): Criterion[] {
  const evaluation = latestEvaluation(submission);
  const coverage =
    evaluation?.acceptanceCoverage &&
    typeof evaluation.acceptanceCoverage === "object"
      ? (evaluation.acceptanceCoverage as Row)
      : null;
  const items = Array.isArray(coverage?.items) ? (coverage.items as Row[]) : [];
  return items.flatMap((item, index) => {
    if (text(item.status) === "not_applicable" || !text(item.criterion))
      return [];
    return [
      {
        key: text(item.key) || `criterion_${index + 1}`,
        criterion: text(item.criterion),
      },
    ];
  });
}
