"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  MessageSquareWarning,
  PackageCheck,
  Star,
  XCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  DeliveryEmpty,
  DeliveryRetryBanner,
  EvidenceList,
  MilestoneTimeline,
  TaskList,
} from "@/components/delivery";
import { toNumber } from "@/components/delivery/helpers";
import {
  getMilestones,
  getTasks,
  type ProjectMilestone,
} from "@/services/planning";
import { getProject } from "@/services/projects";
import {
  getDeliverySubmission,
  listDeliverySubmissions,
  reviewDeliverySubmission,
  type SubmissionDetail,
} from "@/services/project-submissions";
import { listRevisionRequests } from "@/services/revisions";
import { listProjectReleaseRequests } from "@/services/release-requests";
import {
  decideProjectHandoff,
  getProjectHandoff,
  rateProjectContributor,
  type ProjectHandoffOverview,
} from "@/services/project-handoffs";
import { formatDate, formatMoney } from "@/utils/format";
import type { Project } from "@/types/project";
import type {
  DeliveryTask,
  PaymentReleaseRequest,
  ProjectRevisionRequest,
  ProjectSubmission,
  ProjectSubmissionReview,
  SubmissionCriterionReview,
} from "@/types/delivery";

type HumanCriterionReview = {
  criterionKey: string;
  criterion: string;
  rating: number | null;
  comment: string;
};

function submissionReviewCriteria(
  detail: SubmissionDetail,
): Array<Pick<HumanCriterionReview, "criterionKey" | "criterion">> {
  const coverage =
    (detail.latestEvaluationRun ?? detail.evaluationRun)?.acceptanceCoverage ??
    null;
  if (!coverage) return [];

  const completedItems = Array.isArray(coverage.items) ? coverage.items : [];
  const snapshotItems = Array.isArray(coverage.rubricSnapshot?.criteria)
    ? coverage.rubricSnapshot.criteria
    : [];
  const source = completedItems.length > 0 ? completedItems : snapshotItems;
  const seen = new Set<string>();

  return source.flatMap((item, index) => {
    if (completedItems.length > 0 && item.status === "not_applicable") {
      return [];
    }
    const criterion = item.criterion?.trim();
    if (!criterion) return [];
    const criterionKey = item.key?.trim() || `criterion_${index + 1}`;
    if (seen.has(criterionKey)) return [];
    seen.add(criterionKey);
    return [{ criterionKey, criterion }];
  });
}

function reviewCriterionResults(
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

function HumanReviewSummary({ review }: { review: ProjectSubmissionReview }) {
  const criteria = reviewCriterionResults(review);

  return (
    <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-on-surface">
          Human review
        </span>
        <StatusBadge status={review.decision} />
        {review.score !== null && (
          <span className="text-sm font-semibold text-on-surface">
            {Math.round(Number(review.score))}
            <span className="text-on-surface-variant">/100</span>
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
        <ol className="mt-3 space-y-2">
          {criteria.map((item, index) => (
            <li
              key={item.criterionKey}
              className="rounded-md bg-surface-container-lowest p-3 text-sm"
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
    </div>
  );
}

function EvaluationSummary({ detail }: { detail: SubmissionDetail }) {
  const run = detail.latestEvaluationRun ?? detail.evaluationRun ?? null;
  if (!run) return null;

  const score = toNumber(run.score);
  const rubric = run.acceptanceCoverage?.items ?? run.findings?.rubric ?? [];
  const revisionNotes = run.findings?.revisionNotes?.trim();

  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-on-surface">
          Automated review
        </span>
        <StatusBadge status={run.status} />
        {score !== null && (
          <span className="text-sm font-semibold text-on-surface">
            {score}
            <span className="text-on-surface-variant">/100</span>
          </span>
        )}
      </div>

      {run.summary && (
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          {run.summary}
        </p>
      )}

      {run.acceptanceCoverage && (
        <p className="mt-2 text-xs text-on-surface-variant">
          Acceptance criteria: {run.acceptanceCoverage.met} met
          {(run.acceptanceCoverage.notApplicable ?? 0) > 0
            ? ` · ${run.acceptanceCoverage.notApplicable} N/A`
            : ""}
          {run.acceptanceCoverage.unmet > 0
            ? ` · ${run.acceptanceCoverage.unmet} unmet`
            : ""}
          {(run.acceptanceCoverage.pending ?? 0) > 0
            ? ` · ${run.acceptanceCoverage.pending} pending`
            : ""}
          {` · ${run.acceptanceCoverage.total} total`}
        </p>
      )}

      {rubric.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rubric.map((item) => (
            <li
              key={item.criterion}
              className="rounded-md bg-surface-container-lowest p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0 font-medium text-on-surface-variant">
                  {item.criterion}
                </span>
                <StatusBadge
                  status={item.status ?? (item.met ? "met" : "unmet")}
                />
              </div>
              {item.evidence && (
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                  Evidence: {item.evidence}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {(run.findings?.findings?.length ?? 0) > 0 && (
        <div className="mt-3 text-sm text-on-surface-variant">
          <span className="font-medium text-on-surface">Findings</span>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {run.findings?.findings?.map((finding, index) => (
              <li key={`${index}-${finding}`}>{finding}</li>
            ))}
          </ul>
        </div>
      )}

      {(run.findings?.risks?.length ?? 0) > 0 && (
        <div className="mt-3 text-sm text-on-surface-variant">
          <span className="font-medium text-on-surface">Risks</span>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {run.findings?.risks?.map((risk, index) => (
              <li key={`${index}-${risk}`}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      {revisionNotes && (
        <p className="mt-3 text-sm text-on-surface-variant">
          <span className="font-medium text-on-surface">Revision notes: </span>
          {revisionNotes}
        </p>
      )}
    </div>
  );
}

function FinalDeliveryPanel({
  projectId,
  overview,
  onUpdated,
}: {
  projectId: string;
  overview: ProjectHandoffOverview | null;
  onUpdated: () => void;
}) {
  const toast = useToast();
  const [feedback, setFeedback] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [ratingValues, setRatingValues] = useState<Record<string, number>>({});
  const [ratingComments, setRatingComments] = useState<Record<string, string>>({});
  const handoff = overview?.handoff ?? null;
  const report = handoff?.verificationReport;

  const decide = async (decision: "accepted" | "changes_requested") => {
    if (decision === "changes_requested" && !feedback.trim()) {
      toast.error("Feedback required", "Describe the outcome you expected so the principal reviewer can route the revision.");
      return;
    }
    setWorking(decision);
    try {
      await decideProjectHandoff(projectId, decision, feedback);
      toast.success(
        decision === "accepted" ? "Project accepted" : "Changes requested",
        decision === "accepted"
          ? "The project is complete and team ratings are now open."
          : "The principal reviewer was notified immediately.",
      );
      setFeedback("");
      onUpdated();
    } catch (error) {
      toast.error("Could not save your decision", error instanceof Error ? error.message : "Try again.");
    } finally {
      setWorking(null);
    }
  };

  const rate = async (userId: string) => {
    const rating = ratingValues[userId];
    if (!rating) {
      toast.error("Choose a rating", "Select an overall score from 1 to 5.");
      return;
    }
    setWorking(`rating:${userId}`);
    try {
      await rateProjectContributor(projectId, {
        ratedUserId: userId,
        rating,
        comment: ratingComments[userId]?.trim() || undefined,
      });
      toast.success("Rating submitted", "Thank you for reviewing this contributor.");
      onUpdated();
    } catch (error) {
      toast.error("Could not submit rating", error instanceof Error ? error.message : "Try again.");
    } finally {
      setWorking(null);
    }
  };

  return (
    <section className="rounded-xl border border-primary-container/30 bg-surface-container-lowest p-6 card-shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck size={20} className="text-primary-container" />
            <h3 className="font-headline text-xl font-semibold text-on-surface">Final integrated delivery</h3>
          </div>
          <p className="mt-2 text-sm text-on-surface-variant">
            Approved task branches are merged, then the complete default-branch snapshot is tested before it reaches you.
          </p>
        </div>
        <StatusBadge status={handoff?.status ?? "awaiting_tasks"} />
      </div>

      {!handoff ? (
        <p className="mt-4 rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
          Final integration starts automatically after every implementation task is approved.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {handoff.summary && <p className="whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">{handoff.summary}</p>}
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-surface-container-low p-3">
              <p className="text-xs text-on-surface-variant">Integrated branch</p>
              <p className="mt-1 font-mono text-on-surface">{handoff.integrationBranch}</p>
            </div>
            <div className="rounded-lg bg-surface-container-low p-3">
              <p className="text-xs text-on-surface-variant">Verified commit</p>
              <p className="mt-1 truncate font-mono text-on-surface">{handoff.integrationCommitSha ?? "Pending"}</p>
            </div>
            <div className="rounded-lg bg-surface-container-low p-3">
              <p className="text-xs text-on-surface-variant">Final verification</p>
              <p className="mt-1 font-semibold text-on-surface">
                {report?.score != null ? `${report.score}/100 · ` : ""}{report?.recommendation?.replace(/_/g, " ") ?? "Pending"}
              </p>
            </div>
          </div>
          {handoff.lastError && (
            <p className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">{handoff.lastError}</p>
          )}
          {handoff.reviewerFeedback && (
            <p className="rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">Principal reviewer: </span>
              {handoff.reviewerFeedback}
            </p>
          )}
          {(report?.findings?.length ?? 0) > 0 && (
            <div className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">Verification findings</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">{report?.findings?.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {handoff.repositoryUrl && (
              <a href={handoff.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-container hover:underline">
                Open source repository <ExternalLink size={14} />
              </a>
            )}
            {handoff.liveUrl && (
              <a href={handoff.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-container hover:underline">
                Open live delivery <ExternalLink size={14} />
              </a>
            )}
            {handoff.artifactUrls?.map((url, index) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-container hover:underline">
                Artifact {index + 1} <ExternalLink size={14} />
              </a>
            ))}
          </div>

          {overview?.clientCanDecide && (
            <div className="rounded-lg border border-primary-container/30 bg-primary-container/5 p-4">
              <p className="font-semibold text-on-surface">Your acceptance</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Review the delivered result. Accept it if it matches the agreed brief, or describe a concrete outcome that still needs correction.
              </p>
              {handoff.clientReviewDueAt && <p className="mt-2 text-xs text-on-surface-variant">Review requested by {formatDate(handoff.clientReviewDueAt)}</p>}
              <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={3} maxLength={12000} placeholder="Optional acceptance note, or required details when requesting changes." className="input-halo mt-3 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm" />
              <div className="mt-3 flex flex-wrap gap-3">
                <Button size="sm" loading={working === "accepted"} disabled={working !== null} onClick={() => void decide("accepted")}><CheckCircle size={15} /> Accept final delivery</Button>
                <Button size="sm" variant="outline" loading={working === "changes_requested"} disabled={working !== null} onClick={() => void decide("changes_requested")}><MessageSquareWarning size={15} /> Request final changes</Button>
              </div>
            </div>
          )}

          {overview?.ratingsOpen && overview.contributors.length > 0 && (
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-on-surface">Rate the project team</h4>
                <p className="mt-1 text-sm text-on-surface-variant">One saved review per contributor; ratings update their verified platform record.</p>
              </div>
              {overview.contributors.map((contributor) => (
                <div key={contributor.userId} className="rounded-lg border border-outline-variant/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-on-surface">{contributor.name}</p>
                      <p className="text-xs capitalize text-on-surface-variant">{contributor.roleKeys.join(" · ").replace(/_/g, " ")}</p>
                    </div>
                    {contributor.rating && <span className="inline-flex items-center gap-1 font-semibold text-primary-container"><Star size={15} fill="currentColor" /> {contributor.rating.rating}/5</span>}
                  </div>
                  {contributor.rating ? (
                    contributor.rating.comment && <p className="mt-2 text-sm text-on-surface-variant">{contributor.rating.comment}</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-pressed={ratingValues[contributor.userId] === value} onClick={() => setRatingValues((current) => ({ ...current, [contributor.userId]: value }))} className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${ratingValues[contributor.userId] === value ? "border-primary-container bg-primary-container text-on-primary" : "border-outline-variant text-on-surface-variant"}`}>{value}/5</button>)}</div>
                      <input value={ratingComments[contributor.userId] ?? ""} onChange={(event) => setRatingComments((current) => ({ ...current, [contributor.userId]: event.target.value }))} maxLength={4000} placeholder="Optional public feedback" className="input-halo w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm" />
                      <Button size="sm" variant="outline" loading={working === `rating:${contributor.userId}`} disabled={working !== null} onClick={() => void rate(contributor.userId)}>Submit rating</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function CustomerProjectWorkPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [revisions, setRevisions] = useState<ProjectRevisionRequest[]>([]);
  const [releases, setReleases] = useState<PaymentReleaseRequest[]>([]);
  const [handoffOverview, setHandoffOverview] = useState<ProjectHandoffOverview | null>(null);

  const [openSubmission, setOpenSubmission] = useState<SubmissionDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [criterionReviews, setCriterionReviews] = useState<
    Record<string, HumanCriterionReview>
  >({});
  const [manualReviewAcknowledged, setManualReviewAcknowledged] =
    useState(false);
  const [deciding, setDeciding] = useState<
    "approve" | "revise" | "reject" | null
  >(null);

  useEffect(() => {
    if (!projectId) return;

    Promise.allSettled([
      getProject(projectId),
      getMilestones(projectId),
      getTasks(projectId, { limit: 200 }),
      listDeliverySubmissions(projectId),
      listRevisionRequests(projectId),
      listProjectReleaseRequests(projectId),
      getProjectHandoff(projectId),
    ])
      .then(
        ([
          projectResult,
          milestonesResult,
          tasksResult,
          submissionsResult,
          revisionsResult,
          releasesResult,
          handoffResult,
        ]) => {
          setProject(
            projectResult.status === "fulfilled" ? projectResult.value : null,
          );
          setMilestones(
            milestonesResult.status === "fulfilled"
              ? milestonesResult.value
              : [],
          );
          setTasks(
            tasksResult.status === "fulfilled"
              ? (tasksResult.value as DeliveryTask[])
              : [],
          );
          setSubmissions(
            submissionsResult.status === "fulfilled"
              ? submissionsResult.value.items
              : [],
          );
          setRevisions(
            revisionsResult.status === "fulfilled"
              ? revisionsResult.value.items
              : [],
          );
          setReleases(
            releasesResult.status === "fulfilled"
              ? releasesResult.value.items
              : [],
          );
          setHandoffOverview(
            handoffResult.status === "fulfilled" ? handoffResult.value : null,
          );

          const failures: string[] = [];
          if (milestonesResult.status === "rejected")
            failures.push("milestones");
          if (tasksResult.status === "rejected") failures.push("tasks");
          if (submissionsResult.status === "rejected")
            failures.push("submissions");
          if (revisionsResult.status === "rejected")
            failures.push("revision requests");
          if (releasesResult.status === "rejected")
            failures.push("payment releases");
          if (handoffResult.status === "rejected")
            failures.push("final delivery");
          setLoadErrors(failures);
        },
      )
      .finally(() => setLoading(false));
  }, [projectId, reloadKey]);

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadErrors([]);
    setOpenSubmission(null);
    setFeedback("");
    setCriterionReviews({});
    setManualReviewAcknowledged(false);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const live = () => refresh();
    window.addEventListener("nexus:notification", live);
    return () => window.removeEventListener("nexus:notification", live);
  }, [refresh]);

  const latestSubmissionByTask = useMemo(() => {
    const map = new Map<string, ProjectSubmission>();
    for (const submission of submissions) {
      if (!submission.taskId) continue;
      const existing = map.get(submission.taskId);
      if (!existing || submission.version > existing.version) {
        map.set(submission.taskId, submission);
      }
    }
    return map;
  }, [submissions]);

  // Tasks whose milestone is missing would otherwise never render, because the
  // timeline only shows tasks nested under a milestone it knows about.
  const unscheduledTasks = useMemo(() => {
    const milestoneIds = new Set(milestones.map((milestone) => milestone.id));
    return tasks.filter(
      (task) => !task.milestoneId || !milestoneIds.has(task.milestoneId),
    );
  }, [tasks, milestones]);

  const releasesByMilestone = useMemo(() => {
    const map = new Map<string, PaymentReleaseRequest[]>();
    for (const release of releases) {
      if (!release.milestoneId) continue;
      map.set(release.milestoneId, [
        ...(map.get(release.milestoneId) ?? []),
        release,
      ]);
    }
    return map;
  }, [releases]);

  const openDetail = (submissionId: string) => {
    setDetailLoading(true);
    setFeedback("");
    setCriterionReviews({});
    setManualReviewAcknowledged(false);
    getDeliverySubmission(submissionId)
      .then((detail) => {
        setOpenSubmission(detail);
        setCriterionReviews(
          Object.fromEntries(
            submissionReviewCriteria(detail).map((criterion) => [
              criterion.criterionKey,
              { ...criterion, rating: null, comment: "" },
            ]),
          ),
        );
      })
      .catch((error) =>
        toast.error(
          "Could not load submission",
          error instanceof Error ? error.message : "Please try again.",
        ),
      )
      .finally(() => setDetailLoading(false));
  };

  const decide = async (
    decision: "approved" | "changes_requested" | "rejected",
  ) => {
    if (!openSubmission) return;
    if (decision !== "approved" && !feedback.trim()) {
      toast.error(
        "General comments required",
        decision === "rejected"
          ? "Tell the freelancer why this version is rejected."
          : "Tell the freelancer what needs to change.",
      );
      return;
    }
    const criteria = submissionReviewCriteria(openSubmission);
    const unratedCriteria = criteria.filter(
      ({ criterionKey }) =>
        criterionReviews[criterionKey]?.rating === null ||
        criterionReviews[criterionKey]?.rating === undefined,
    );
    if (unratedCriteria.length > 0) {
      toast.error(
        "Rate every criterion",
        `${unratedCriteria.length} review ${unratedCriteria.length === 1 ? "criterion is" : "criteria are"} still unrated.`,
      );
      return;
    }
    const evaluation =
      openSubmission.latestEvaluationRun ?? openSubmission.evaluationRun;
    if (decision === "approved") {
      if (evaluation?.status !== "completed") {
        toast.error(
          "Evaluation not complete",
          "Approval is available only after the latest automated evaluation finishes.",
        );
        return;
      }
      if (evaluation.recommendation === "changes_requested") {
        toast.error(
          "Changes are required",
          "This commit cannot be approved until the freelancer submits a passing revision.",
        );
        return;
      }
      if (
        evaluation.recommendation === "manual_review" &&
        (!manualReviewAcknowledged || feedback.trim().length < 20)
      ) {
        toast.error(
          "Manual review evidence required",
          "Confirm the manual review and describe what you inspected in at least 20 characters.",
        );
        return;
      }
    }

    const criteriaPayload = criteria.map(({ criterionKey }) => {
      const input = criterionReviews[criterionKey];
      return {
        criterionKey,
        rating: input.rating as number,
        comment: input.comment.trim() || undefined,
      };
    });
    const requestedItems = criteriaPayload
      .filter((item) => item.rating <= 2 || item.comment)
      .map((item) => ({
        area:
          criteria.find(
            (criterion) => criterion.criterionKey === item.criterionKey,
          )?.criterion ?? item.criterionKey,
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
      await reviewDeliverySubmission(openSubmission.id, {
        decision,
        feedback: feedback.trim() || undefined,
        criteriaReviews: criteriaPayload,
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
        decision === "approved"
          ? "The task is now marked done."
          : "The freelancer has been notified.",
      );
      refresh();
    } catch (error) {
      toast.error(
        "Could not save your decision",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setDeciding(null);
    }
  };

  // Customers can follow evidence and verdicts, while the assigned principal
  // reviewer owns technical acceptance. Admin review remains an override.
  const canDecide = false;
  const latestEvaluation =
    openSubmission?.latestEvaluationRun ??
    openSubmission?.evaluationRun ??
    null;
  const reviewCriteria = openSubmission
    ? submissionReviewCriteria(openSubmission)
    : [];
  const allCriteriaRated = reviewCriteria.every(({ criterionKey }) => {
    const rating = criterionReviews[criterionKey]?.rating;
    return typeof rating === "number" && rating >= 1 && rating <= 5;
  });
  const humanRatingAverage = reviewCriteria.length
    ? reviewCriteria.reduce(
        (sum, { criterionKey }) =>
          sum + (criterionReviews[criterionKey]?.rating ?? 0),
        0,
      ) / reviewCriteria.length
    : null;
  const currentReview = openSubmission?.reviews?.[0];
  const evaluatedCommitMatches =
    !openSubmission ||
    !["pull_request", "repository"].includes(openSubmission.submissionType) ||
    Boolean(
      openSubmission.commitSha &&
      latestEvaluation?.evaluatedCommitSha &&
      openSubmission.commitSha.toLowerCase() ===
        latestEvaluation.evaluatedCommitSha.toLowerCase(),
    );
  const approvalReady = Boolean(
    allCriteriaRated &&
    latestEvaluation?.status === "completed" &&
    evaluatedCommitMatches &&
    ["approve", "manual_review"].includes(
      latestEvaluation.recommendation ?? "",
    ) &&
    (latestEvaluation.recommendation !== "manual_review" ||
      (manualReviewAcknowledged && feedback.trim().length >= 20)),
  );

  return (
    <DashboardShell
      role="customer"
      title="Delivery"
      subtitle="Track implementation progress, principal-reviewer verdicts, and payments."
    >
      <Link
        href={`/projects/${projectId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary-container"
      >
        <ArrowLeft size={16} /> Back to project
      </Link>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading delivery...</p>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-5">
            {loadErrors.length > 0 && (
              <DeliveryRetryBanner
                title="Some sections could not be loaded"
                message={`Failed to load ${loadErrors.join(", ")}.`}
                onAction={refresh}
              />
            )}

            <FinalDeliveryPanel
              projectId={projectId}
              overview={handoffOverview}
              onUpdated={refresh}
            />

            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-headline text-2xl font-semibold text-on-surface">
                    {project?.title ?? "Project delivery"}
                  </h2>
                  {project?.description && (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                      {project.description}
                    </p>
                  )}
                </div>
                {project?.status && <StatusBadge status={project.status} />}
              </div>
            </section>

            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <h3 className="font-headline text-xl font-semibold text-on-surface">
                Milestones
              </h3>
              <MilestoneTimeline
                className="mt-4"
                milestones={milestones}
                tasks={tasks}
                renderExtra={(milestone) => {
                  const milestoneReleases =
                    releasesByMilestone.get(milestone.id) ?? [];
                  const milestoneTasks = tasks.filter(
                    (task) => task.milestoneId === milestone.id,
                  );

                  return (
                    <div className="space-y-3">
                      {milestoneReleases.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-on-surface-variant">
                            Escrow
                          </span>
                          {milestoneReleases.map((release) => (
                            <span
                              key={release.id}
                              className="flex items-center gap-2"
                            >
                              <span className="font-semibold text-on-surface">
                                {formatMoney(
                                  toNumber(release.amount),
                                  release.currency,
                                )}
                              </span>
                              <StatusBadge status={release.status} />
                            </span>
                          ))}
                        </div>
                      )}

                      {milestoneTasks.length > 0 && (
                        <TaskList
                          tasks={milestoneTasks}
                          allTasks={tasks}
                          onSelect={(task) => {
                            const submission = latestSubmissionByTask.get(
                              task.id,
                            );
                            if (submission) openDetail(submission.id);
                          }}
                          selectedTaskId={openSubmission?.taskId ?? null}
                        />
                      )}
                    </div>
                  );
                }}
                emptyLabel="The implementation plan has not been materialised yet."
              />

              {unscheduledTasks.length > 0 && (
                <div className="mt-6">
                  <h4 className="mb-3 text-sm font-semibold text-on-surface">
                    Not linked to a milestone
                  </h4>
                  <TaskList
                    tasks={unscheduledTasks}
                    allTasks={tasks}
                    onSelect={(task) => {
                      const submission = latestSubmissionByTask.get(task.id);
                      if (submission) openDetail(submission.id);
                    }}
                    selectedTaskId={openSubmission?.taskId ?? null}
                  />
                </div>
              )}
            </section>

            {openSubmission && (
              <section className="rounded-xl border border-primary-container/40 bg-surface-container-lowest p-6 card-shadow">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-headline text-xl font-semibold text-on-surface">
                      {openSubmission.title || "Submitted work"}
                    </h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Version {openSubmission.version}
                      {openSubmission.submittedAt
                        ? ` · submitted ${formatDate(openSubmission.submittedAt)}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status={openSubmission.status} />
                </div>

                {openSubmission.summary && (
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                    {openSubmission.summary}
                  </p>
                )}

                <div className="mt-4 space-y-4">
                  <EvidenceList submission={openSubmission} />
                  <EvaluationSummary detail={openSubmission} />
                  {currentReview && (
                    <HumanReviewSummary review={currentReview} />
                  )}
                </div>

                {canDecide ? (
                  <div className="mt-5 space-y-4">
                    {reviewCriteria.length > 0 && (
                      <div className="space-y-3 rounded-lg border border-outline-variant/40 bg-surface-container-low p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-on-surface">
                              Human criterion review
                            </h4>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              Rate every applicable criterion from 1 to 5. Add a
                              focused comment wherever it helps the freelancer
                              act on your decision.
                            </p>
                          </div>
                          {humanRatingAverage !== null && allCriteriaRated && (
                            <span className="rounded-full bg-primary-container/10 px-3 py-1 text-sm font-semibold text-primary-container">
                              Average {humanRatingAverage.toFixed(1)}/5
                            </span>
                          )}
                        </div>
                        <ol className="space-y-3">
                          {reviewCriteria.map((criterion, index) => {
                            const input = criterionReviews[
                              criterion.criterionKey
                            ] ?? {
                              ...criterion,
                              rating: null,
                              comment: "",
                            };
                            return (
                              <li
                                key={criterion.criterionKey}
                                className="rounded-lg bg-surface-container-lowest p-4"
                              >
                                <p className="text-sm font-medium leading-6 text-on-surface">
                                  {index + 1}. {criterion.criterion}
                                </p>
                                <div
                                  className="mt-3 flex flex-wrap gap-2"
                                  aria-label={`Rating for ${criterion.criterion}`}
                                >
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                      key={rating}
                                      type="button"
                                      aria-pressed={input.rating === rating}
                                      onClick={() =>
                                        setCriterionReviews((current) => ({
                                          ...current,
                                          [criterion.criterionKey]: {
                                            ...input,
                                            rating,
                                          },
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
                                  htmlFor={`criterion-comment-${criterion.criterionKey}`}
                                  className="mt-3 block text-xs font-medium text-on-surface-variant"
                                >
                                  Criterion comment (optional)
                                </label>
                                <textarea
                                  id={`criterion-comment-${criterion.criterionKey}`}
                                  rows={2}
                                  maxLength={4000}
                                  value={input.comment}
                                  onChange={(event) =>
                                    setCriterionReviews((current) => ({
                                      ...current,
                                      [criterion.criterionKey]: {
                                        ...input,
                                        comment: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Evidence, issue, or specific improvement for this criterion."
                                  className="input-halo mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none transition-all placeholder:text-outline/50"
                                />
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}
                    <label
                      htmlFor="review-feedback"
                      className="block text-sm font-medium text-on-surface"
                    >
                      General comments
                    </label>
                    <textarea
                      id="review-feedback"
                      rows={3}
                      maxLength={12000}
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                      placeholder="Summarize the verdict. Required for revisions, rejection, and manual-review approvals."
                      className="input-halo w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-all placeholder:text-outline/50"
                    />
                    {latestEvaluation?.recommendation === "manual_review" && (
                      <label className="flex items-start gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-low p-3 text-sm text-on-surface-variant">
                        <input
                          type="checkbox"
                          checked={manualReviewAcknowledged}
                          onChange={(event) =>
                            setManualReviewAcknowledged(event.target.checked)
                          }
                          className="mt-0.5 h-4 w-4"
                        />
                        <span>
                          I inspected the exact commit, diff, and available
                          verification evidence. My feedback records the manual
                          evidence used.
                        </span>
                      </label>
                    )}
                    {!allCriteriaRated && reviewCriteria.length > 0 && (
                      <p className="text-sm text-on-surface-variant">
                        Rate every criterion before submitting a decision.
                      </p>
                    )}
                    {!approvalReady && (
                      <p className="text-sm text-on-surface-variant">
                        Approval is locked until the latest evaluation
                        completes, matches this commit, and returns an approving
                        or manual-review verdict, and every criterion is rated.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        size="sm"
                        onClick={() => decide("approved")}
                        loading={deciding === "approve"}
                        disabled={deciding !== null || !approvalReady}
                      >
                        <CheckCircle size={15} />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide("changes_requested")}
                        loading={deciding === "revise"}
                        disabled={deciding !== null || !allCriteriaRated}
                      >
                        <MessageSquareWarning size={15} />
                        Request changes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide("rejected")}
                        loading={deciding === "reject"}
                        disabled={deciding !== null || !allCriteriaRated}
                      >
                        <XCircle size={15} />
                        Reject version
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-on-surface-variant">
                    Technical acceptance is handled by the project&apos;s
                    principal reviewer. You can follow the evidence, AI verdict,
                    comments, and final status here.
                  </p>
                )}
              </section>
            )}

            {detailLoading && (
              <p className="text-sm text-on-surface-variant">
                Loading submission...
              </p>
            )}

            {!milestones.length && !tasks.length && (
              <DeliveryEmpty
                title="Implementation has not started"
                description="Once the plan is approved and tasks are assigned, progress will appear here."
              />
            )}
          </main>

          <aside className="space-y-4">
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
              <h3 className="font-headline text-base font-semibold text-on-surface">
                Submitted work
              </h3>
              {latestSubmissionByTask.size ? (
                <ul className="mt-4 space-y-2">
                  {[...latestSubmissionByTask.values()].map((submission) => (
                    <li key={submission.id}>
                      <button
                        type="button"
                        onClick={() => openDetail(submission.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-outline-variant/30 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <span className="min-w-0 truncate text-on-surface">
                          {submission.title || "Untitled"}
                        </span>
                        <StatusBadge status={submission.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-on-surface-variant">
                  Nothing submitted yet.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
              <h3 className="font-headline text-base font-semibold text-on-surface">
                Revision requests
              </h3>
              {revisions.length ? (
                <ul className="mt-4 space-y-3">
                  {revisions.map((revision) => (
                    <li key={revision.id} className="text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 font-medium text-on-surface">
                          {revision.title}
                        </span>
                        <StatusBadge status={revision.status} />
                      </div>
                      {revision.dueAt && (
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Due {formatDate(revision.dueAt)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-on-surface-variant">
                  No open revisions.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
              <h3 className="font-headline text-base font-semibold text-on-surface">
                Payment releases
              </h3>
              {releases.length ? (
                <ul className="mt-4 space-y-3">
                  {releases.map((release) => (
                    <li
                      key={release.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="font-semibold text-on-surface">
                        {formatMoney(
                          toNumber(release.amount),
                          release.currency,
                        )}
                      </span>
                      <StatusBadge status={release.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-on-surface-variant">
                  No release requests yet.
                </p>
              )}
            </section>
          </aside>
        </div>
      )}
    </DashboardShell>
  );
}
