"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useActionDialog } from "@/components/ui/action-dialog";
import { DeliveryContractView } from "@/components/delivery";
import {
  getDeliveryEvidenceRequirements,
  type DeliveryContract,
} from "@/services/project-handoffs";
import {
  getReviewerImplementationRatings,
  getReviewerOverview,
  getReviewerHandoff,
  getReviewerMatchingRun,
  getReviewerMatchingRuns,
  getReviewerPlan,
  getReviewerPlanningSubmission,
  getReviewerPlanningSubmissions,
  getReviewerPlans,
  getReviewerReleaseRequests,
  getReviewerSubmission,
  getReviewerSubmissions,
  reviewReviewerPlan,
  reviewReviewerPlanningSubmission,
  retryReviewerPlanningSubmissionEvaluation,
  reviewReviewerRelease,
  reviewReviewerHandoff,
  reviewReviewerMatchingRun,
  reviewReviewerSubmission,
  rateReviewerImplementationContributor,
  retargetReviewerSubmissionPullRequest,
  retryReviewerSubmissionEvaluation,
  type ReviewerPlanDetail,
  type ReviewerPlanningSubmissionDetail,
  type ReviewerMatchingRun,
  type ReviewerMatchingRunDetail,
  type ReviewerImplementationRatings,
} from "@/services/reviewer";

type Row = Record<string, unknown>;
type Criterion = {
  key: string;
  criterion: string;
  category: string;
  status: string;
  evidence: string;
};

const text = (value: unknown) => (typeof value === "string" ? value : "");
const record = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};

function submissionIntegration(item: Row) {
  return record(record(item.metadata).integration);
}

/**
 * Strips retrieval-algorithm wording from the run summary. Reviewers were shown
 * "vector + BM25 via reciprocal rank fusion", which means nothing to the person
 * making the decision and crowds out what does. See ISSUES.md #24.
 */
function readableSummary(summary: string | null | undefined) {
  if (!summary) return "";
  return summary
    .replace(
      /\s*\((?:[^()]*(?:vector|BM25|reciprocal rank fusion|embedding)[^()]*)\)/gi,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Pairs each project requirement with what the freelancer submitted for it and
 * the AI's verdict on it. Requirements come from `evaluationRequirements` so
 * every criterion appears even when the freelancer skipped it. See ISSUES.md #30.
 */
function requirementRows(detail: ReviewerPlanningSubmissionDetail) {
  const checks = detail.evaluationResult?.checks ?? [];
  const evidence = detail.content?.requirementEvidence ?? {};
  const requirements = detail.evaluationRequirements?.length
    ? detail.evaluationRequirements
    : checks.map((check) => ({ key: check.key, title: check.title }));

  return requirements.map((requirement) => {
    const check = checks.find((entry) => entry.key === requirement.key);
    const submitted = evidence[requirement.key] ?? {};
    return {
      key: requirement.key,
      title: requirement.title || check?.title || requirement.key,
      status: check?.status ?? "missing",
      evidence: check?.evidence ?? null,
      feedback: check?.feedback ?? null,
      submitted: (submitted.summary ?? "").trim(),
      urls: Array.isArray(submitted.urls) ? submitted.urls : [],
      disposition: submitted.disposition ?? null,
      notApplicableReason: submitted.notApplicableReason ?? null,
    };
  });
}

function verdictLabel(status: string) {
  switch (status) {
    case "met":
      return "meets requirement";
    case "partial":
      return "partly done";
    case "missing":
      return "not addressed";
    case "conflict":
      return "contradicts the brief";
    case "not_applicable":
      return "not applicable";
    default:
      return status;
  }
}

function verdictTone(status: string) {
  switch (status) {
    case "met":
      return "border-green-500/40 bg-green-500/5";
    case "partial":
      return "border-amber-500/40 bg-amber-500/5";
    case "conflict":
      return "border-red-500/40 bg-red-500/5";
    case "not_applicable":
      return "border-outline-variant/30 bg-surface-container-low";
    default:
      return "border-outline-variant/40 bg-surface-container-low";
  }
}

const ACTIVE_PLANNING_EVALUATION_STATUSES = ["pending", "queued", "running"];

function planningEvaluationStatus(item: { evaluationStatus?: unknown }) {
  return text(item.evaluationStatus) || "pending";
}

function planningApprovalBlock(item: { evaluationStatus?: unknown }) {
  switch (planningEvaluationStatus(item)) {
    case "completed":
      return undefined;
    case "pending_architecture":
      return "UI/UX evaluation starts automatically after the architecture deliverable is approved.";
    case "failed":
      return "AI evaluation failed. Open the deliverable to see the cause and retry it.";
    case "running":
      return "AI is reviewing this deliverable. Approval unlocks automatically when it finishes.";
    default:
      return "AI evaluation is queued. Approval unlocks automatically when it finishes.";
  }
}

/** Only http(s) links are rendered as links. Mirrors the server-side rule in ISSUES.md #29. */
function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value.trim()).protocol);
  } catch {
    return false;
  }
}

/** Plans persist milestone ids as `key`/`milestoneKey`; the generator schema uses
 * `clientKey`/`milestoneClientKey`. Match on whichever is present. ISSUES.md #33. */
function milestoneIdOf(milestone: { key?: string; clientKey?: string }) {
  return milestone.clientKey ?? milestone.key ?? "";
}
function taskMilestoneIdOf(task: {
  milestoneKey?: string;
  milestoneClientKey?: string;
}) {
  return task.milestoneClientKey ?? task.milestoneKey ?? "";
}

export default function ReviewerProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();
  const actionDialog = useActionDialog();
  const [overview, setOverview] = useState<Row | null>(null);
  const [planning, setPlanning] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Row[]>([]);
  const [matchingRuns, setMatchingRuns] = useState<ReviewerMatchingRun[]>([]);
  const [submissions, setSubmissions] = useState<Row[]>([]);
  const [releases, setReleases] = useState<Row[]>([]);
  const [handoff, setHandoff] = useState<Row | null>(null);
  const [implementationRatings, setImplementationRatings] =
    useState<ReviewerImplementationRatings | null>(null);
  const [implementationRatingValues, setImplementationRatingValues] = useState<
    Record<string, number>
  >({});
  const [implementationRatingComments, setImplementationRatingComments] =
    useState<Record<string, string>>({});
  const [handoffTaskId, setHandoffTaskId] = useState("");
  const [handoffSummary, setHandoffSummary] = useState("");
  const [handoffLiveUrl, setHandoffLiveUrl] = useState("");
  const [handoffArtifactUrls, setHandoffArtifactUrls] = useState("");
  const [handoffFeedback, setHandoffFeedback] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<Row | null>(
    null,
  );
  const [selectedMatchingRun, setSelectedMatchingRun] =
    useState<ReviewerMatchingRunDetail | null>(null);
  // The submission the reviewer is currently reading, and the set they have
  // opened at least once. Approve stays disabled until a submission has been
  // read, so a deliverable cannot be waved through unseen. ISSUES.md #30.
  const [openDeliverable, setOpenDeliverable] =
    useState<ReviewerPlanningSubmissionDetail | null>(null);
  const [reviewedSubmissionIds, setReviewedSubmissionIds] = useState<
    Set<string>
  >(new Set());
  const [openPlan, setOpenPlan] = useState<ReviewerPlanDetail | null>(null);
  const [reviewedPlanIds, setReviewedPlanIds] = useState<Set<string>>(
    new Set(),
  );
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const handoffContract = handoff
    ? ((record(handoff.metadata).deliveryContract as
        | DeliveryContract
        | undefined) ?? null)
    : null;
  const handoffEvidenceRequirements = getDeliveryEvidenceRequirements(
    handoffContract,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const results = await Promise.allSettled([
        getReviewerOverview(projectId),
        getReviewerPlanningSubmissions(projectId),
        getReviewerPlans(projectId),
        getReviewerMatchingRuns(projectId),
        getReviewerSubmissions(projectId),
        getReviewerReleaseRequests(projectId),
        getReviewerHandoff(projectId),
        getReviewerImplementationRatings(projectId),
      ]);
      const [
        overviewResult,
        planningResult,
        plansResult,
        matchingResult,
        submissionsResult,
        releasesResult,
        handoffResult,
        implementationRatingsResult,
      ] = results;
      if (overviewResult.status === "rejected") throw overviewResult.reason;

      setOverview(overviewResult.value);
      setPlanning(
        planningResult.status === "fulfilled" ? planningResult.value : [],
      );
      setPlans(plansResult.status === "fulfilled" ? plansResult.value : []);
      setMatchingRuns(
        matchingResult.status === "fulfilled" ? matchingResult.value : [],
      );
      setSubmissions(
        submissionsResult.status === "fulfilled" ? submissionsResult.value : [],
      );
      setReleases(
        releasesResult.status === "fulfilled" ? releasesResult.value : [],
      );
      const handoffResultValue =
        handoffResult.status === "fulfilled" ? handoffResult.value : null;
      setHandoff(handoffResultValue);
      const implementationRatingsValue =
        implementationRatingsResult.status === "fulfilled"
          ? implementationRatingsResult.value
          : null;
      setImplementationRatings(implementationRatingsValue);
      setImplementationRatingValues(
        Object.fromEntries(
          (implementationRatingsValue?.contributors ?? [])
            .filter(
              (contributor) =>
                !contributor.rating && contributor.recommendedRating,
            )
            .map((contributor) => [
              contributor.userId,
              contributor.recommendedRating as number,
            ]),
        ),
      );
      setHandoffSummary(
        handoffResultValue?.reviewerApprovedAt
          ? text(handoffResultValue.summary)
          : "",
      );
      setHandoffLiveUrl(text(handoffResultValue?.liveUrl));
      setHandoffArtifactUrls(
        Array.isArray(handoffResultValue?.artifactUrls)
          ? handoffResultValue.artifactUrls
              .filter((item): item is string => typeof item === "string")
              .join("\n")
          : "",
      );
      const partialFailure = results
        .slice(1)
        .find((result) => result.status === "rejected");
      if (partialFailure?.status === "rejected") {
        setLoadError(
          partialFailure.reason instanceof Error
            ? partialFailure.reason.message
            : "One review queue could not be refreshed.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again.";
      setLoadError(message);
      toast.error("Could not load reviewer workbench", message);
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

  const hasActivePlanningEvaluation = planning.some((item) =>
    ACTIVE_PLANNING_EVALUATION_STATUSES.includes(
      planningEvaluationStatus(item),
    ),
  );

  useEffect(() => {
    if (!hasActivePlanningEvaluation) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const current = await getReviewerPlanningSubmissions(projectId);
        if (!cancelled) setPlanning(current);
      } catch {
        // Keep the workbench stable; opening the deliverable reports errors.
      }
    };
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hasActivePlanningEvaluation, projectId]);

  const project = (overview?.project ?? {}) as Row;
  const attention = (overview?.attention ?? {}) as Row;
  const criteria = useMemo(
    () => submissionCriteria(selectedSubmission),
    [selectedSubmission],
  );
  const selectedSubmissionRecord = useMemo(
    () => submissionRecord(selectedSubmission),
    [selectedSubmission],
  );
  const selectedEvaluation = useMemo(
    () => latestEvaluation(selectedSubmission),
    [selectedSubmission],
  );
  const selectedSubmissionNeedsManualReview = useMemo(
    () => evaluationNeedsManualReview(selectedEvaluation),
    [selectedEvaluation],
  );
  const selectedEvaluationStatus = text(selectedEvaluation?.status);
  const selectedEvaluationRecommendation = text(
    selectedEvaluation?.recommendation,
  );
  const selectedEvaluationPending = ["queued", "running"].includes(
    selectedEvaluationStatus,
  );
  const selectedEvaluationReady = selectedEvaluationStatus === "completed";
  const selectedEvaluationFailed =
    !selectedEvaluation ||
    ["failed", "cancelled", "superseded"].includes(selectedEvaluationStatus);
  const selectedEvaluationRetryable =
    selectedEvaluationFailed ||
    (selectedEvaluationReady && criteria.length === 0);
  const selectedPullRequestReadiness = useMemo(
    () => submissionPullRequestReadiness(selectedSubmission),
    [selectedSubmission],
  );
  const selectedApprovalBranchReady =
    !selectedPullRequestReadiness ||
    (selectedPullRequestReadiness.targetReady === true &&
      selectedPullRequestReadiness.historyReady === true &&
      selectedPullRequestReadiness.evaluationCurrent === true);
  const openPlanningEvaluationStatus = openDeliverable
    ? planningEvaluationStatus(openDeliverable)
    : "";
  const openPlanningEvaluationActive =
    ACTIVE_PLANNING_EVALUATION_STATUSES.includes(openPlanningEvaluationStatus);
  const openPlanningEvaluationComplete =
    openPlanningEvaluationStatus === "completed";
  const openPlanningApprovalBlock = openDeliverable
    ? planningApprovalBlock(openDeliverable)
    : undefined;

  useEffect(() => {
    const submissionId = text(selectedSubmissionRecord?.id);
    if (!submissionId || !selectedEvaluationPending) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const detail = await getReviewerSubmission(submissionId);
        if (!cancelled) setSelectedSubmission(detail);
      } catch {
        // Keep the open review stable; the normal manual refresh still reports errors.
      }
    };
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedEvaluationPending, selectedSubmissionRecord?.id]);

  useEffect(() => {
    const submissionId = openDeliverable?.id;
    if (!submissionId || !openPlanningEvaluationActive) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const detail = await getReviewerPlanningSubmission(submissionId);
        if (cancelled) return;
        setOpenDeliverable(detail);
        setPlanning((current) =>
          current.map((item) =>
            text(item.id) === detail.id ? { ...item, ...detail } : item,
          ),
        );
      } catch {
        // Preserve the open review. A manual retry reports actionable errors.
      }
    };
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [openDeliverable?.id, openPlanningEvaluationActive]);
  const currentMatchingRuns = useMemo(() => {
    const seen = new Set<string>();
    return matchingRuns.filter((run) => {
      if (run.targetRoleKey === "principal_reviewer") return false;
      const target = `${run.targetType}:${run.targetTaskId ?? run.targetRoleKey ?? run.id}`;
      if (seen.has(target)) return false;
      seen.add(target);
      return true;
    });
  }, [matchingRuns]);

  const openPlanningSubmission = async (submissionId: string) => {
    setWorking(`submission:${submissionId}`);
    try {
      const detail = await getReviewerPlanningSubmission(submissionId);
      setOpenDeliverable(detail);
      setReviewedSubmissionIds((previous) =>
        new Set(previous).add(submissionId),
      );
    } catch (error) {
      toast.error(
        "Could not open the submission",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setWorking(null);
    }
  };

  const openProjectPlan = async (planId: string) => {
    setWorking(`plan:${planId}`);
    try {
      setOpenPlan(await getReviewerPlan(planId));
      setReviewedPlanIds((previous) => new Set(previous).add(planId));
    } catch (error) {
      toast.error(
        "Could not open the plan",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setWorking(null);
    }
  };

  const openMatchingRun = async (run: ReviewerMatchingRun) => {
    setWorking(`match:${run.id}`);
    try {
      setSelectedMatchingRun(await getReviewerMatchingRun(run.id));
    } catch (error) {
      toast.error(
        "Could not load candidate profiles",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setWorking(null);
    }
  };

  const selectCandidate = async (candidateId: string) => {
    if (!selectedMatchingRun) return;
    const candidate = selectedMatchingRun.candidates.find(
      (item) => item.id === candidateId,
    );
    const name = candidate?.freelancer?.name || "this freelancer";
    const confirmed = await actionDialog.confirm({
      title: `Invite ${name}?`,
      description:
        "If they do not respond within the invitation window, matching moves to the next eligible candidate.",
      confirmLabel: "Send invitation",
    });
    if (!confirmed) return;
    const saved = await act(`candidate:${candidateId}`, () =>
      reviewReviewerMatchingRun(selectedMatchingRun.id, {
        decision: "approved",
        selectedCandidateId: candidateId,
      }),
    );
    if (saved) setSelectedMatchingRun(null);
  };

  const decidePlanning = async (
    item: Row,
    status: "approved" | "changes_requested" | "rejected",
  ) => {
    if (status === "approved") {
      const blocked = planningApprovalBlock(item);
      if (blocked) {
        toast.error("AI evaluation is not complete", blocked);
        return false;
      }
    }
    const notes =
      status === "approved"
        ? ""
        : await actionDialog.prompt({
            title:
              status === "rejected"
                ? "Reject planning submission"
                : "Request planning changes",
            description:
              "Give the freelancer clear, actionable feedback for this decision.",
            label: "Reviewer feedback",
            placeholder: "Describe what needs to change and why.",
            confirmLabel:
              status === "rejected" ? "Reject submission" : "Request changes",
            required: true,
            danger: status === "rejected",
          });
    if (status !== "approved" && notes === null) return false;
    const recommendation = text(item.evaluationRecommendation);
    let aiOverrideReason = "";
    if (status === "approved" && recommendation !== "approve") {
      aiOverrideReason =
        (await actionDialog.prompt({
          title: "Document manual approval",
          description:
            "The AI did not recommend approval. Record the evidence you verified before overriding it.",
          label: "Override evidence",
          placeholder: "Explain what you checked and why approval is appropriate.",
          confirmLabel: "Approve with evidence",
          required: true,
          minLength: 20,
        })) ?? "";
      if (!aiOverrideReason) return false;
    }
    return act(text(item.id), () =>
      reviewReviewerPlanningSubmission(text(item.id), {
        status,
        adminNotes: notes || undefined,
        aiOverride: Boolean(aiOverrideReason),
        aiOverrideReason: aiOverrideReason || undefined,
      }),
    );
  };

  const retryPlanningEvaluation = async () => {
    if (!openDeliverable) return;
    const submissionId = openDeliverable.id;
    const actionId = `planning-evaluation:${submissionId}`;
    setWorking(actionId);
    try {
      await retryReviewerPlanningSubmissionEvaluation(submissionId);
      const detail = await getReviewerPlanningSubmission(submissionId);
      setOpenDeliverable(detail);
      setPlanning((current) =>
        current.map((item) =>
          text(item.id) === detail.id ? { ...item, ...detail } : item,
        ),
      );
      toast.success(
        "AI evaluation queued",
        "This review will update automatically when evaluation finishes.",
      );
    } catch (error) {
      toast.error(
        "Could not retry AI evaluation",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setWorking(null);
    }
  };

  const decidePlan = async (
    item: Row,
    status: "approved" | "changes_requested" | "rejected",
  ) => {
    const notes =
      status === "approved"
        ? ""
        : await actionDialog.prompt({
            title:
              status === "rejected" ? "Reject project plan" : "Request plan changes",
            description:
              "Your feedback is sent into plan regeneration and remains in the review history.",
            label: "Required changes",
            placeholder: "Describe exactly what the revised plan should address.",
            confirmLabel:
              status === "rejected" ? "Reject plan" : "Request changes",
            required: true,
            danger: status === "rejected",
          });
    if (status !== "approved" && notes === null) return;
    await act(text(item.id), () =>
      reviewReviewerPlan(text(item.id), {
          status,
          adminNotes: notes || undefined,
          materialize: status === "approved",
        }),
      status === "changes_requested"
        ? (result) =>
            result.regeneration?.queued === false
              ? {
                  title: "Changes saved",
                  message:
                    "Plan generation is temporarily delayed. Automatic recovery will retry it shortly.",
                }
              : {
                  title: "Changes requested",
                  message:
                    "Your feedback was sent to plan generation. A revised version will appear here automatically.",
                }
        : undefined,
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
    if (!selectedSubmission || !selectedSubmissionRecord) return;
    if (decision === "approved" && !selectedApprovalBranchReady) {
      toast.error(
        "Pull request is not ready",
        text(selectedPullRequestReadiness?.blocker) ||
          "Resolve the pull-request base and run a fresh evaluation first.",
      );
      return;
    }
    if (decision === "approved" && !selectedEvaluationReady) {
      toast.error(
        "AI evaluation is not complete",
        "Wait for the current evaluation or retry it if the run failed.",
      );
      return;
    }
    const requiresManualEvidence =
      decision === "approved" && selectedSubmissionNeedsManualReview;
    const feedbackResult = await actionDialog.prompt({
      title:
        decision === "approved"
          ? "Approve submission"
          : decision === "rejected"
            ? "Reject submission"
            : "Request submission changes",
      description: requiresManualEvidence
        ? "The AI recommendation requires a documented manual review before approval."
        : decision === "approved"
          ? "Add an optional overall note to the freelancer."
          : "Give the freelancer actionable feedback for the next submission.",
      label: requiresManualEvidence ? "Manual review evidence" : "Reviewer feedback",
      placeholder: requiresManualEvidence
        ? "Explain what you verified and why you are overriding the AI recommendation."
        : "Add your overall comments.",
      confirmLabel:
        decision === "approved"
          ? "Continue approval"
          : decision === "rejected"
            ? "Reject submission"
            : "Request changes",
      required: decision !== "approved" || requiresManualEvidence,
      minLength: requiresManualEvidence ? 20 : undefined,
      danger: decision === "rejected",
    });
    if (feedbackResult === null) return;
    const feedback = feedbackResult.trim();
    if (criteria.some((criterion) => !ratings[criterion.key])) {
      toast.error(
        "Rate every criterion",
        "Each applicable criterion needs a rating from 1 to 5.",
      );
      return;
    }
    const manualReview = selectedSubmissionNeedsManualReview;
    if (decision === "approved" && manualReview && feedback.length < 20) {
      toast.error(
        "Manual review evidence required",
        "Add at least 20 characters explaining your verification.",
      );
      return;
    }
    const saved = await act(text(selectedSubmissionRecord.id), () =>
      reviewReviewerSubmission(text(selectedSubmissionRecord.id), {
        decision,
        feedback: feedback || undefined,
        createRevisionRequest: decision === "changes_requested",
        manualReviewAcknowledged: decision === "approved" && manualReview,
        criteriaReviews: criteria.map((criterion) => ({
          criterionKey: criterion.key,
          rating: ratings[criterion.key],
          comment: comments[criterion.key]?.trim() || undefined,
        })),
      }),
    );
    if (saved) setSelectedSubmission(null);
  };

  const retrySelectedSubmissionEvaluation = async () => {
    if (!selectedSubmissionRecord) return;
    const submissionId = text(selectedSubmissionRecord.id);
    const actionId = `evaluation:${submissionId}`;
    setWorking(actionId);
    try {
      await retryReviewerSubmissionEvaluation(submissionId);
      setSelectedSubmission(await getReviewerSubmission(submissionId));
      toast.success(
        "Evaluation queued",
        "The AI evaluation will refresh here automatically.",
      );
    } catch (error) {
      toast.error(
        "Could not retry evaluation",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setWorking(null);
    }
  };

  const retargetSelectedSubmissionPullRequest = async () => {
    if (!selectedSubmissionRecord) return;
    const submissionId = text(selectedSubmissionRecord.id);
    const actionId = `retarget:${submissionId}`;
    setWorking(actionId);
    try {
      await retargetReviewerSubmissionPullRequest(submissionId);
      setRatings({});
      setComments({});
      setSelectedSubmission(await getReviewerSubmission(submissionId));
      toast.success(
        "Pull request retargeted",
        "A fresh evaluation was queued against the project default branch.",
      );
    } catch (error) {
      toast.error(
        "Could not retarget pull request",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setWorking(null);
    }
  };

  const decideRelease = async (
    item: Row,
    decision: "approved" | "rejected",
  ) => {
    const notesResult = await actionDialog.prompt({
      title:
        decision === "approved" ? "Approve payment release" : "Reject payment release",
      description:
        decision === "approved"
          ? "Add an optional note before releasing this payment."
          : "Explain why this payment cannot be released.",
      label: decision === "approved" ? "Payment note (optional)" : "Rejection reason",
      placeholder: "Add a note for the project record.",
      confirmLabel: decision === "approved" ? "Release payment" : "Reject release",
      required: decision === "rejected",
      danger: decision === "rejected",
    });
    if (notesResult === null) return;
    const notes = notesResult.trim();
    await act(text(item.id), () =>
      reviewReviewerRelease(text(item.id), {
        decision,
        reviewNotes: notes || undefined,
        releaseNow: decision === "approved",
      }),
    );
  };

  const decideHandoff = async (decision: "approved" | "changes_requested") => {
    if (!handoff) return;
    if (
      decision === "changes_requested" &&
      (!handoffTaskId || !handoffFeedback.trim())
    ) {
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
      handoffSummary.trim().length < 20
    ) {
      toast.error(
        "Complete the client handoff",
        "Add a useful client-facing summary of at least 20 characters.",
      );
      return;
    }
    if (
      decision === "approved" &&
      handoffEvidenceRequirements.liveUrl &&
      !handoffLiveUrl.trim()
    ) {
      toast.error(
        "Live delivery required",
        "The client selected a live delivery, so add its accessible URL.",
      );
      return;
    }
    if (
      decision === "approved" &&
      handoffEvidenceRequirements.artifactUrls &&
      artifactUrls.length === 0
    ) {
      toast.error(
        "Delivery artifact required",
        "The client selected an artifact or documentation deliverable, so add its URL.",
      );
      return;
    }
    const report = (handoff.verificationReport ?? {}) as Row;
    const manualReview = text(report.recommendation) === "manual_review";
    if (
      decision === "approved" &&
      manualReview &&
      handoffFeedback.trim().length < 20
    ) {
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
        summary:
          decision === "approved"
            ? handoffSummary.trim() || undefined
            : undefined,
        liveUrl:
          decision === "approved"
            ? handoffLiveUrl.trim() || undefined
            : undefined,
        artifactUrls: decision === "approved" ? artifactUrls : undefined,
        manualReviewAcknowledged: decision === "approved" && manualReview,
      }),
    );
  };

  const submitImplementationRating = async (userId: string) => {
    const rating = implementationRatingValues[userId];
    if (!rating) {
      toast.error("Choose a rating", "Select a score from 1 to 5.");
      return;
    }
    await act(`implementation-rating:${userId}`, () =>
      rateReviewerImplementationContributor(projectId, {
          ratedUserId: userId,
          rating,
          comment: implementationRatingComments[userId]?.trim() || undefined,
        }),
      {
        title: "Freelancer rating saved",
        message: "The confirmed rating is now part of their platform record.",
      },
    );
  };

  const act = async <T,>(
    id: string,
    operation: () => Promise<T>,
    success?:
      | { title: string; message: string }
      | ((result: T) => { title: string; message: string }),
  ) => {
    setWorking(id);
    try {
      const result = await operation();
      const successMessage =
        typeof success === "function" ? success(result) : success;
      toast.success(
        successMessage?.title ?? "Decision saved",
        successMessage?.message ??
          "The freelancer and project stakeholders were notified.",
      );
      await load();
      return true;
    } catch (error) {
      toast.error(
        "Could not save decision",
        error instanceof Error ? error.message : "Try again.",
      );
      return false;
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
      ) : loadError && !overview ? (
        <div className="rounded-xl border border-error/30 bg-error/5 p-6">
          <h2 className="font-semibold text-on-surface">
            Reviewer workspace unavailable
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">{loadError}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void load()}
          >
            <RefreshCw size={16} /> Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {loadError && (
            <p className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-on-surface-variant">
              Some reviewer data could not be refreshed: {loadError}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
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
            title="Team and task matching"
            empty="No candidate shortlist needs your attention yet. Architecture and UI/UX matching begins after you accept the reviewer role; implementation matching begins after the plan is approved."
          >
            {currentMatchingRuns.map((run) => {
              const invitationStatus = run.invitation?.status ?? null;
              const invitationActive =
                !run.selectedAssignment &&
                ["pending", "accepting"].includes(invitationStatus ?? "");
              const selectionFinished =
                Boolean(run.selectedAssignment) ||
                invitationStatus === "accepted";
              const canChoose =
                ["completed", "reviewed"].includes(run.status) &&
                run.candidateCount > 0 &&
                !invitationActive &&
                !selectionFinished;
              const status = invitationActive
                ? "invitation_pending"
                : selectionFinished
                  ? "selected"
                  : canChoose
                    ? "selection_required"
                    : run.status;
              return (
                <div
                  key={run.id}
                  className="flex flex-col gap-4 rounded-lg bg-surface-container-low p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-on-surface">
                        {run.targetType === "task"
                          ? run.taskTitle || "Implementation task"
                          : roleLabel(run.targetRoleKey)}
                      </p>
                      <StatusBadge status={status} />
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {run.selectedAssignment
                        ? `${run.selectedAssignment.freelancer?.name || "Freelancer"} selected · ${run.selectedAssignment.status.replaceAll("_", " ")}`
                        : run.candidateCount > 0
                          ? `${Math.min(run.candidateCount, 3)} top profile${Math.min(run.candidateCount, 3) === 1 ? "" : "s"} ready for review`
                          : run.summary ||
                            "No eligible candidates were ranked."}
                      {invitationActive && run.invitation?.expiresAt
                        ? ` · response due ${new Date(run.invitation.expiresAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={canChoose ? "primary" : "outline"}
                    loading={working === `match:${run.id}`}
                    disabled={working !== null}
                    onClick={() => void openMatchingRun(run)}
                  >
                    <Users size={16} />
                    {canChoose
                      ? `Review ${run.candidateCount} candidate${run.candidateCount === 1 ? "" : "s"}`
                      : selectionFinished
                        ? "View selection"
                        : "View matching"}
                  </Button>
                </div>
              );
            })}
          </Queue>

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
                  // Show the AI's verdict, not the evaluation job's lifecycle
                  // state — "Completed" on 0/100 work read as "this is done".
                  status={
                    text(item.evaluationRecommendation) ||
                    text(item.evaluationStatus) ||
                    text(item.status)
                  }
                  detail={`${text(item.submissionType)}${item.version != null ? ` · v${String(item.version)}` : ""}${item.evaluationScore != null ? ` · AI score ${String(item.evaluationScore)}/100` : ""}`}
                  working={
                    working === `submission:${text(item.id)}` ||
                    working === item.id
                  }
                  onOpen={() => void openPlanningSubmission(text(item.id))}
                  openLabel="Open deliverable"
                  approveDisabledReason={
                    planningApprovalBlock(item) ??
                    (reviewedSubmissionIds.has(text(item.id))
                      ? undefined
                      : "Open the deliverable before approving it.")
                  }
                  approveLabel={
                    planningEvaluationStatus(item) === "completed"
                      ? "Approve"
                      : planningEvaluationStatus(item) === "failed"
                        ? "Evaluation failed"
                        : "Waiting for AI"
                  }
                  onApprove={() => void decidePlanning(item, "approved")}
                  onChanges={() =>
                    void decidePlanning(item, "changes_requested")
                  }
                />
              ))}
          </Queue>

          <Queue
            title="Generated Scrum plans"
            empty="No Scrum plan awaits review or regeneration."
          >
            {plans
              .filter(
                (item) =>
                  item.isCurrent !== false &&
                  ["generated", "changes_requested"].includes(
                    text(item.status),
                  ),
              )
              .map((item) => {
                const status = text(item.status);
                if (status === "changes_requested") {
                  return (
                    <div
                      key={text(item.id)}
                      className="flex items-start gap-3 rounded-lg bg-surface-container-low p-4"
                    >
                      <Clock3
                        size={18}
                        className="mt-0.5 shrink-0 text-primary-container"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-on-surface">
                            Plan v{String(item.version ?? "")}
                          </p>
                          <StatusBadge status={status} />
                        </div>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          A revised plan is being generated automatically from
                          your feedback.
                        </p>
                        {text(item.adminNotes) && (
                          <p className="mt-2 text-sm text-on-surface-variant">
                            Feedback: {text(item.adminNotes)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <ReviewRow
                    key={text(item.id)}
                    title={`Plan v${String(item.version ?? "")}`}
                    status={status}
                    detail={text(item.summary)}
                    working={
                      working === `plan:${text(item.id)}` ||
                      working === item.id
                    }
                    onOpen={() => void openProjectPlan(text(item.id))}
                    openLabel="Open plan"
                    approveDisabledReason={
                      reviewedPlanIds.has(text(item.id))
                        ? undefined
                        : "Open the plan before approving it."
                    }
                    onApprove={() => void decidePlan(item, "approved")}
                    onChanges={() =>
                      void decidePlan(item, "changes_requested")
                    }
                    approveLabel="Approve and start matching"
                  />
                );
              })}
          </Queue>

          <Queue
            title="Integration issues"
            empty="No approved pull request needs conflict resolution."
          >
            {submissions
              .filter(
                (item) =>
                  text(item.status) === "approved" &&
                  text(submissionIntegration(item).status) === "failed",
              )
              .map((item) => {
                const integration = submissionIntegration(item);
                const pullRequestUrl = text(item.pullRequestUrl);
                return (
                  <div
                    key={text(item.id)}
                    className="rounded-lg border border-error/30 bg-error/5 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-on-surface">
                            {text(item.title) || "Approved implementation"}
                          </p>
                          <StatusBadge status="integration_failed" />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                          {text(integration.error) ||
                            "GitHub could not merge this pull request."}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-on-surface">
                          Approval and payment remain recorded. The freelancer
                          must merge main into{" "}
                          <span className="font-mono text-xs">
                            {text(item.branchName) || "the feature branch"}
                          </span>
                          , resolve the conflicts there, and push. Nexus will
                          reopen and evaluate only this submission.
                        </p>
                      </div>
                      {isHttpUrl(pullRequestUrl) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(
                              pullRequestUrl,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          <ExternalLink size={16} /> Open pull request
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </Queue>

          <Queue
            title="Developer submissions"
            empty="No implementation work awaits review."
          >
            {submissions
              .filter((item) => {
                const status = text(item.status);
                return (
                  ["submitted", "under_review"].includes(status) ||
                  (status === "changes_requested" && !item.reviewedBy)
                );
              })
              .map((item) => {
                const branchSync = record(record(item.metadata).branchSync);
                const branchConflict = text(branchSync.status) === "conflict";
                const branchUpdateRequested =
                  text(branchSync.status) === "update_requested";
                return (
                  <div
                    key={text(item.id)}
                    className={
                      "flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 " +
                      (branchConflict
                        ? "border border-error/30 bg-error/5"
                        : branchUpdateRequested
                          ? "border border-primary/30 bg-primary/5"
                          : "bg-surface-container-low")
                    }
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-on-surface">
                          {text(item.title) || "Implementation submission"}
                        </p>
                        {branchConflict && (
                          <StatusBadge status="merge_conflict" />
                        )}
                        {branchUpdateRequested && (
                          <StatusBadge status="syncing_main" />
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant">
                        {branchConflict
                          ? text(branchSync.message) ||
                            "The freelancer must update the feature branch from main."
                          : branchUpdateRequested
                            ? "Nexus asked GitHub to update this feature branch from main. A fresh evaluation will start when the new commit appears."
                            : text(item.summary)}
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
                );
              })}
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
                    Final AI verification:{" "}
                    {text(
                      (handoff.verificationReport as Row).recommendation,
                    ).replace(/_/g, " ") || "pending"}
                    {(handoff.verificationReport as Row).score != null
                      ? ` · ${String((handoff.verificationReport as Row).score)}/100`
                      : ""}
                  </p>
                )}
                <DeliveryContractView
                  contract={
                    (record(handoff.metadata).deliveryContract as
                      | DeliveryContract
                      | undefined) ?? null
                  }
                />
                {implementationRatings?.ratingsOpen &&
                  implementationRatings.contributors.length > 0 && (
                    <section className="border-y border-outline-variant/30 py-4">
                      <h3 className="font-semibold text-on-surface">
                        Implementation team ratings
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                        The suggested score is the rounded average of your saved
                        task reviews. Confirm it or adjust it before submitting.
                      </p>
                      <div className="mt-3 divide-y divide-outline-variant/30">
                        {implementationRatings.contributors.map(
                          (contributor) => (
                            <div key={contributor.userId} className="py-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-on-surface">
                                    {contributor.name}
                                  </p>
                                  <p className="text-xs capitalize text-on-surface-variant">
                                    {contributor.roleKeys
                                      .join(" · ")
                                      .replace(/_/g, " ")}
                                  </p>
                                </div>
                                {contributor.taskAverageScore !== null && (
                                  <span className="text-sm font-semibold text-primary-container">
                                    Task average {Math.round(contributor.taskAverageScore)}/100
                                  </span>
                                )}
                              </div>
                              <ul className="mt-2 space-y-1 text-xs text-on-surface-variant">
                                {contributor.tasks.map((task) => (
                                  <li key={task.taskId}>
                                    {task.title}: {task.reviewScore === null ? "not scored" : `${Math.round(task.reviewScore)}/100`}
                                  </li>
                                ))}
                              </ul>
                              {contributor.rating ? (
                                <div className="mt-3 inline-flex items-center gap-2 font-semibold text-primary-container">
                                  <Star size={16} fill="currentColor" />
                                  {contributor.rating.rating}/5 saved
                                </div>
                              ) : (
                                <div className="mt-3 space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    {[1, 2, 3, 4, 5].map((value) => (
                                      <button
                                        key={value}
                                        type="button"
                                        aria-pressed={
                                          implementationRatingValues[
                                            contributor.userId
                                          ] === value
                                        }
                                        onClick={() =>
                                          setImplementationRatingValues(
                                            (current) => ({
                                              ...current,
                                              [contributor.userId]: value,
                                            }),
                                          )
                                        }
                                        className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                                          implementationRatingValues[
                                            contributor.userId
                                          ] === value
                                            ? "border-primary-container bg-primary-container text-on-primary"
                                            : "border-outline-variant text-on-surface-variant"
                                        }`}
                                      >
                                        {value}/5
                                      </button>
                                    ))}
                                  </div>
                                  <input
                                    value={
                                      implementationRatingComments[
                                        contributor.userId
                                      ] ?? ""
                                    }
                                    onChange={(event) =>
                                      setImplementationRatingComments(
                                        (current) => ({
                                          ...current,
                                          [contributor.userId]:
                                            event.target.value,
                                        }),
                                      )
                                    }
                                    maxLength={4000}
                                    placeholder="Optional final feedback"
                                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    loading={
                                      working ===
                                      `implementation-rating:${contributor.userId}`
                                    }
                                    disabled={working !== null}
                                    onClick={() =>
                                      void submitImplementationRating(
                                        contributor.userId,
                                      )
                                    }
                                  >
                                    <Star size={15} /> Save freelancer rating
                                  </Button>
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </section>
                  )}
                {text(handoff.status) === "reviewer_review" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-on-surface-variant">
                      Client-facing summary
                      <textarea
                        value={handoffSummary}
                        onChange={(event) =>
                          setHandoffSummary(event.target.value)
                        }
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
                      />
                    </label>
                    {handoffEvidenceRequirements.liveUrl && (
                      <label className="text-sm text-on-surface-variant">
                        Live URL required by the delivery contract
                        <input
                          value={handoffLiveUrl}
                          onChange={(event) =>
                            setHandoffLiveUrl(event.target.value)
                          }
                          placeholder="https://..."
                          className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
                        />
                      </label>
                    )}
                    {handoffEvidenceRequirements.artifactUrls && (
                      <label className="text-sm text-on-surface-variant sm:col-span-2">
                        Artifact or documentation URLs required by the delivery
                        contract (one per line)
                        <textarea
                          value={handoffArtifactUrls}
                          onChange={(event) =>
                            setHandoffArtifactUrls(event.target.value)
                          }
                          rows={2}
                          placeholder="https://..."
                          className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
                        />
                      </label>
                    )}
                    {handoffEvidenceRequirements.sourceArchive && (
                      <p className="self-end text-sm leading-6 text-on-surface-variant sm:col-span-2">
                        Source code will be packaged from the exact verified
                        commit and delivered privately through Nexus. No client
                        GitHub account is required.
                      </p>
                    )}
                  </div>
                )}
                {[
                  "reviewer_review",
                  "verification_failed",
                  "client_changes_requested",
                ].includes(text(handoff.status)) && (
                  <label className="block text-sm text-on-surface-variant">
                    Review evidence or revision feedback
                    <textarea
                      value={handoffFeedback}
                      onChange={(event) =>
                        setHandoffFeedback(event.target.value)
                      }
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
                    />
                  </label>
                )}
                {[
                  "verification_failed",
                  "reviewer_review",
                  "client_changes_requested",
                ].includes(text(handoff.status)) && (
                  <label className="block text-sm text-on-surface-variant">
                    Responsible task for a revision
                    <select
                      value={handoffTaskId}
                      onChange={(event) => setHandoffTaskId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
                    >
                      <option value="">Choose task</option>
                      {submissions
                        .filter(
                          (item) =>
                            text(item.status) === "approved" &&
                            text(item.taskId),
                        )
                        .map((item) => (
                          <option
                            key={text(item.taskId)}
                            value={text(item.taskId)}
                          >
                            {text(item.title) || text(item.taskId)}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <div className="flex flex-wrap gap-3">
                  {text(handoff.status) === "reviewer_review" && (
                    <Button
                      loading={working === `handoff:${text(handoff.id)}`}
                      disabled={working !== null}
                      onClick={() => void decideHandoff("approved")}
                    >
                      <CheckCircle2 size={16} /> Send verified delivery to
                      client
                    </Button>
                  )}
                  {[
                    "verification_failed",
                    "reviewer_review",
                    "client_changes_requested",
                  ].includes(text(handoff.status)) && (
                    <Button
                      variant="outline"
                      loading={working === `handoff:${text(handoff.id)}`}
                      disabled={working !== null}
                      onClick={() => void decideHandoff("changes_requested")}
                    >
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

      {openPlan && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpenPlan(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-surface-container-lowest p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
              Build plan awaiting your approval
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-on-surface">
              Plan v{openPlan.version ?? ""}
            </h2>
            {openPlan.summary && (
              <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
                {openPlan.summary}
              </p>
            )}

            {(() => {
              const tasks = openPlan.tasks ?? [];
              const milestones = openPlan.milestones ?? [];
              const totalHours = tasks.reduce(
                (sum, task) => sum + Number(task.estimatedHours ?? 0),
                0,
              );
              const emptyMilestones = milestones.filter(
                (milestone) =>
                  !tasks.some(
                    (task) =>
                      taskMilestoneIdOf(task) === milestoneIdOf(milestone),
                  ),
              );
              const oversized = tasks.filter(
                (task) => Number(task.estimatedHours ?? 0) > 40,
              );
              return (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Milestones", String(milestones.length)],
                      ["Tasks", String(tasks.length)],
                      ["Total hours", String(totalHours)],
                      [
                        "Milestones with no work",
                        String(emptyMilestones.length),
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className={`rounded-lg border p-3 ${
                          label === "Milestones with no work" &&
                          emptyMilestones.length > 0
                            ? "border-red-500/40 bg-red-500/5"
                            : "border-outline-variant/30"
                        }`}
                      >
                        <p className="text-lg font-semibold text-on-surface">
                          {value}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {emptyMilestones.length > 0 && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                      <p className="text-sm font-semibold text-red-600">
                        Scope with no work planned
                      </p>
                      <p className="mt-1 text-sm text-on-surface">
                        {emptyMilestones
                          .map((milestone) => milestone.title)
                          .join(", ")}{" "}
                        — nobody will build this. Request changes rather than
                        approving.
                      </p>
                    </div>
                  )}

                  {oversized.length > 0 && (
                    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                      <p className="text-sm font-semibold text-amber-700">
                        Tasks that may be too large
                      </p>
                      <p className="mt-1 text-sm text-on-surface">
                        {oversized
                          .map(
                            (task) => `${task.title} (${task.estimatedHours}h)`,
                          )
                          .join(", ")}
                      </p>
                    </div>
                  )}

                  <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                    The work, by milestone
                  </h3>
                  <div className="mt-3 space-y-4">
                    {milestones.map((milestone) => {
                      const milestoneTasks = tasks.filter(
                        (task) =>
                          taskMilestoneIdOf(task) === milestoneIdOf(milestone),
                      );
                      return (
                        <div
                          key={milestoneIdOf(milestone) || milestone.title}
                          className={`rounded-xl border p-4 ${
                            milestoneTasks.length
                              ? "border-outline-variant/30"
                              : "border-red-500/40 bg-red-500/5"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-on-surface">
                              {milestone.title}
                            </p>
                            <span className="text-xs text-on-surface-variant">
                              day {milestone.startDay ?? 0} ·{" "}
                              {milestone.estimatedDays ?? 0} days ·{" "}
                              {milestoneTasks.length} task
                              {milestoneTasks.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          {milestone.description && (
                            <p className="mt-1 text-sm text-on-surface-variant">
                              {milestone.description}
                            </p>
                          )}
                          {milestoneTasks.length === 0 ? (
                            <p className="mt-2 text-sm font-medium text-red-600">
                              No tasks — this scope is not planned.
                            </p>
                          ) : (
                            <ul className="mt-3 space-y-2">
                              {milestoneTasks.map((task) => (
                                <li
                                  key={task.clientKey ?? task.key ?? task.title}
                                  className="rounded-lg bg-surface-container-low p-3"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-on-surface">
                                      {task.title}
                                    </p>
                                    <span
                                      className={`text-xs ${
                                        Number(task.estimatedHours ?? 0) > 40
                                          ? "font-semibold text-amber-700"
                                          : "text-on-surface-variant"
                                      }`}
                                    >
                                      {task.roleKey ?? "unassigned role"} ·{" "}
                                      {task.estimatedHours ?? 0}h
                                      {task.budgetAmount != null &&
                                        ` · ${task.budgetAmount} ${task.currency ?? ""}`}
                                    </span>
                                  </div>
                                  {task.description && (
                                    <p className="mt-1 text-sm text-on-surface-variant">
                                      {task.description}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenPlan(null)}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const row = plans.find(
                    (entry) => text(entry.id) === openPlan.id,
                  );
                  if (row) void decidePlan(row, "changes_requested");
                  setOpenPlan(null);
                }}
              >
                Request changes
              </Button>
              <Button
                onClick={() => {
                  const row = plans.find(
                    (entry) => text(entry.id) === openPlan.id,
                  );
                  if (row) void decidePlan(row, "approved");
                  setOpenPlan(null);
                }}
              >
                Approve and start matching
              </Button>
            </div>
          </div>
        </div>
      )}

      {openDeliverable && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpenDeliverable(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-surface-container-lowest p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                  Deliverable under review
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-on-surface">
                  {openDeliverable.title ||
                    openDeliverable.submissionType ||
                    "Planning deliverable"}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {openDeliverable.submissionType}
                  {openDeliverable.version != null &&
                    ` · version ${openDeliverable.version}`}
                  {openDeliverable.freelancer?.name &&
                    ` · ${openDeliverable.freelancer.name}`}
                  {openDeliverable.submittedAt &&
                    ` · submitted ${new Date(openDeliverable.submittedAt).toLocaleString()}`}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-3xl font-semibold ${
                    Number(openDeliverable.evaluationScore ?? 0) >= 80
                      ? "text-green-600"
                      : Number(openDeliverable.evaluationScore ?? 0) >= 50
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {openDeliverable.evaluationScore != null
                    ? `${Number(openDeliverable.evaluationScore)}`
                    : "—"}
                  <span className="text-base text-on-surface-variant">
                    /100
                  </span>
                </p>
                <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                  AI: {openDeliverable.evaluationRecommendation ?? "pending"}
                </p>
              </div>
            </div>

            {openDeliverable.summary && (
              <div className="mt-5 rounded-xl bg-surface-container-low p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Freelancer&apos;s summary
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface">
                  {openDeliverable.summary}
                </p>
              </div>
            )}

            <div
              className={`mt-5 rounded-xl border p-4 ${
                openPlanningEvaluationComplete
                  ? "border-green-500/35 bg-green-500/5"
                  : openPlanningEvaluationStatus === "failed"
                    ? "border-red-500/35 bg-red-500/5"
                    : openPlanningEvaluationStatus === "pending_architecture"
                      ? "border-amber-500/35 bg-amber-500/5"
                      : "border-outline-variant/40 bg-surface-container-low"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold text-on-surface">
                    {openPlanningEvaluationActive && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {openPlanningEvaluationComplete && (
                      <CheckCircle2 size={16} className="text-green-600" />
                    )}
                    {openPlanningEvaluationStatus === "failed" && (
                      <ShieldAlert size={16} className="text-red-600" />
                    )}
                    {openPlanningEvaluationStatus ===
                      "pending_architecture" && (
                      <Clock3 size={16} className="text-amber-600" />
                    )}
                    {openPlanningEvaluationStatus === "running"
                      ? "AI is reviewing this deliverable"
                      : openPlanningEvaluationStatus === "completed"
                        ? "AI evaluation completed"
                        : openPlanningEvaluationStatus === "failed"
                          ? "AI evaluation failed"
                          : openPlanningEvaluationStatus ===
                              "pending_architecture"
                            ? "Waiting for architecture approval"
                            : "AI evaluation queued"}
                  </p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {openPlanningEvaluationStatus === "completed"
                      ? `Recommendation: ${openDeliverable.evaluationRecommendation ?? "manual review"}${openDeliverable.evaluatedAt ? ` · finished ${new Date(openDeliverable.evaluatedAt).toLocaleString()}` : ""}`
                      : openPlanningEvaluationStatus === "pending_architecture"
                        ? "The UI/UX evaluation will start automatically after the architecture contract is approved."
                        : openPlanningEvaluationStatus === "failed"
                          ? openDeliverable.evaluationError ||
                            "The evaluation did not complete. Retry without resubmitting the deliverable."
                          : "Approval is paused. This page checks for the result automatically every five seconds."}
                  </p>
                </div>
                <StatusBadge status={openPlanningEvaluationStatus} />
              </div>
              {openPlanningEvaluationStatus === "failed" && (
                <Button
                  className="mt-3 w-auto"
                  size="sm"
                  variant="outline"
                  loading={
                    working === `planning-evaluation:${openDeliverable.id}`
                  }
                  onClick={() => void retryPlanningEvaluation()}
                >
                  <RefreshCw size={16} /> Retry AI evaluation
                </Button>
              )}
            </div>

            {(openDeliverable.evaluationResult?.risks?.length ?? 0) > 0 && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  Risks the AI raised
                </p>
                <ul className="mt-1 list-disc pl-5 text-sm text-on-surface">
                  {openDeliverable.evaluationResult?.risks?.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Requirement by requirement
            </h3>
            <p className="mb-3 text-xs text-on-surface-variant">
              What the freelancer wrote, next to the AI&apos;s verdict on it.
              You decide — the AI only recommends.
            </p>

            <div className="space-y-3">
              {requirementRows(openDeliverable).map((row) => (
                <div
                  key={row.key}
                  className={`rounded-xl border p-4 ${verdictTone(row.status)}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-on-surface">{row.title}</p>
                    <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-on-surface">
                      {verdictLabel(row.status)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        Submitted
                      </p>
                      {row.disposition === "not_applicable" ? (
                        <p className="mt-1 text-sm italic text-on-surface-variant">
                          Marked not applicable
                          {row.notApplicableReason
                            ? `: ${row.notApplicableReason}`
                            : "."}
                        </p>
                      ) : row.submitted ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface">
                          {row.submitted}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm italic text-on-surface-variant">
                          Nothing submitted for this requirement.
                        </p>
                      )}
                      {row.urls.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {row.urls.map((url) => (
                            <li key={url}>
                              {isHttpUrl(url) ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary-container underline break-all"
                                >
                                  {url}
                                </a>
                              ) : (
                                <span className="text-sm text-red-600 break-all">
                                  {url} (not a usable link)
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        AI assessment
                      </p>
                      {row.evidence && (
                        <p className="mt-1 text-sm text-on-surface">
                          {row.evidence}
                        </p>
                      )}
                      {row.feedback && (
                        <p className="mt-2 text-sm text-on-surface-variant">
                          <span className="font-medium">What to fix: </span>
                          {row.feedback}
                        </p>
                      )}
                      {!row.evidence && !row.feedback && (
                        <p className="mt-1 text-sm italic text-on-surface-variant">
                          No assessment recorded.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpenDeliverable(null)}
              >
                Close
              </Button>
              <Button
                variant="outline"
                disabled={working !== null}
                onClick={async () => {
                  const saved = await decidePlanning(
                    openDeliverable as unknown as Row,
                    "changes_requested",
                  );
                  if (saved) setOpenDeliverable(null);
                }}
              >
                Request changes
              </Button>
              <Button
                disabled={
                  Boolean(openPlanningApprovalBlock) || working !== null
                }
                title={openPlanningApprovalBlock}
                onClick={async () => {
                  const saved = await decidePlanning(
                    openDeliverable as unknown as Row,
                    "approved",
                  );
                  if (saved) setOpenDeliverable(null);
                }}
              >
                {openPlanningEvaluationComplete ? "Approve" : "Waiting for AI"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedMatchingRun && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedMatchingRun(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-surface-container-lowest p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                  Your decision as principal reviewer
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-on-surface">
                  {selectedMatchingRun.targetType === "task"
                    ? selectedMatchingRun.taskTitle || "Implementation task"
                    : roleLabel(selectedMatchingRun.targetRoleKey)}
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
                  {readableSummary(selectedMatchingRun.summary) ||
                    "Compare the ranked evidence and select one freelancer."}
                </p>
              </div>
              <StatusBadge
                status={
                  selectedMatchingRun.selectedAssignment
                    ? "selected"
                    : selectedMatchingRun.invitation
                      ? `invitation_${selectedMatchingRun.invitation.status}`
                      : selectedMatchingRun.status
                }
              />
            </div>

            {selectedMatchingRun.selectedAssignment && (
              <div className="mt-5 rounded-lg border border-primary-container/25 bg-primary-container/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                      Selected freelancer
                    </p>
                    <p className="mt-1 font-medium text-on-surface">
                      {selectedMatchingRun.selectedAssignment.freelancer
                        ?.name || "Freelancer"}
                    </p>
                    {selectedMatchingRun.selectedAssignment.freelancer
                      ?.githubUsername && (
                      <a
                        href={`https://github.com/${selectedMatchingRun.selectedAssignment.freelancer.githubUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-sm font-medium text-primary-container"
                      >
                        {`@${selectedMatchingRun.selectedAssignment.freelancer.githubUsername}`}
                      </a>
                    )}
                  </div>
                  <StatusBadge
                    status={selectedMatchingRun.selectedAssignment.status}
                  />
                </div>
              </div>
            )}

            {selectedMatchingRun.task && (
              <div className="mt-5 grid gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Schedule
                  </p>
                  <p className="mt-1 text-sm text-on-surface">
                    {selectedMatchingRun.task.dueAt
                      ? `Due ${new Date(selectedMatchingRun.task.dueAt).toLocaleString()}`
                      : "Deadline follows the approved plan"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Dependencies
                  </p>
                  <p className="mt-1 text-sm text-on-surface">
                    {selectedMatchingRun.task.dependencies.length
                      ? `${selectedMatchingRun.task.dependencies.length} predecessor task${selectedMatchingRun.task.dependencies.length === 1 ? "" : "s"}; work cannot start until they finish`
                      : "No blocking predecessor"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Required skills
                  </p>
                  <p className="mt-1 text-sm text-on-surface">
                    {selectedMatchingRun.task.requiredSkills.join(", ") ||
                      "Defined by the task contract"}
                  </p>
                </div>
              </div>
            )}

            {selectedMatchingRun.invitation &&
              !selectedMatchingRun.selectedAssignment && (
                <p className="mt-5 rounded-lg border border-primary-container/20 bg-primary-container/5 p-3 text-sm text-on-surface-variant">
                  Invitation{" "}
                  {selectedMatchingRun.invitation.status.replaceAll("_", " ")}
                  {selectedMatchingRun.invitation.expiresAt &&
                  ["pending", "accepting"].includes(
                    selectedMatchingRun.invitation.status,
                  )
                    ? ` · expires ${new Date(selectedMatchingRun.invitation.expiresAt).toLocaleString()}`
                    : ""}
                  {selectedMatchingRun.invitation.responseReason
                    ? ` · ${selectedMatchingRun.invitation.responseReason}`
                    : ""}
                </p>
              )}

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              {selectedMatchingRun.candidates.map((candidate) => {
                const profile = candidate.freelancer;
                // Which candidate leads on each scored dimension. Comparing two
                // columns of bare numbers by eye was the hard part of this
                // screen. See ISSUES.md #24.
                const hasRival = selectedMatchingRun.candidates.length > 1;
                const bestByDimension: Record<string, number> = {};
                for (const other of selectedMatchingRun.candidates) {
                  for (const [key, value] of Object.entries(
                    other.scoreBreakdown ?? {},
                  )) {
                    const numeric =
                      typeof value === "number" ? value : Number(value);
                    if (!Number.isFinite(numeric)) continue;
                    bestByDimension[key] = Math.max(
                      bestByDimension[key] ?? Number.NEGATIVE_INFINITY,
                      numeric,
                    );
                  }
                }
                const inviteOpen = [
                  "pending",
                  "accepting",
                  "accepted",
                ].includes(selectedMatchingRun.invitation?.status ?? "");
                const selectionFinished = Boolean(
                  selectedMatchingRun.selectedAssignment,
                );
                const isSelectedCandidate = Boolean(
                  selectedMatchingRun.selectedAssignment &&
                  (selectedMatchingRun.selectedAssignment.sourceCandidateId ===
                    candidate.id ||
                    selectedMatchingRun.selectedAssignment
                      .freelancerProfileId === candidate.freelancerProfileId),
                );
                const candidateEligible = [
                  "recommended",
                  "shortlisted",
                  "selected",
                ].includes(candidate.status);
                const canSelect =
                  Boolean(profile?.isAvailable) &&
                  Boolean(profile?.githubUsername) &&
                  candidateEligible &&
                  !inviteOpen &&
                  !selectionFinished;
                return (
                  <article
                    key={candidate.id}
                    className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-low p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                          Rank #{candidate.rank}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-on-surface">
                          {profile?.name || "Freelancer profile"}
                        </h3>
                        <p className="text-sm text-on-surface-variant">
                          {profile?.headline || "Verified Nexus freelancer"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-primary-container/10 px-3 py-2 text-center">
                        <p className="text-lg font-semibold text-primary-container">
                          {Math.round(Number(candidate.score))}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">
                          match
                        </p>
                      </div>
                    </div>

                    {profile?.bio && (
                      <p className="mt-4 line-clamp-4 text-sm text-on-surface-variant">
                        {profile.bio}
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <Metric
                        icon={<BriefcaseBusiness size={14} />}
                        label={`${profile?.yearsExperience ?? 0} years`}
                      />
                      <Metric
                        icon={<Clock3 size={14} />}
                        label={`${profile?.availabilityHours ?? 0} hrs/week`}
                      />
                      <Metric
                        icon={<Star size={14} />}
                        label={
                          profile?.avgRating != null
                            ? `${profile.avgRating.toFixed(1)} (${profile.ratingsCount})`
                            : "No ratings yet"
                        }
                      />
                      <Metric
                        icon={<CheckCircle2 size={14} />}
                        label={
                          (profile?.completedTasks ?? 0) > 0
                            ? `${profile?.performanceScore ?? 0}% performance`
                            : "No delivery history"
                        }
                      />
                    </div>

                    {candidate.scoreBreakdown && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {Object.entries(candidate.scoreBreakdown)
                          .slice(0, 8)
                          .map(([key, value]) => {
                            const numeric =
                              typeof value === "number" ? value : Number(value);
                            const best = bestByDimension[key];
                            const leads =
                              Number.isFinite(numeric) &&
                              best != null &&
                              numeric >= best &&
                              hasRival;
                            return (
                              <div
                                key={key}
                                className={`rounded-lg border p-2 ${
                                  leads
                                    ? "border-primary-container/50 bg-primary-container/5"
                                    : "border-outline-variant/20"
                                }`}
                              >
                                <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">
                                  {key.replaceAll("_", " ")}
                                  {leads && " · leads"}
                                </p>
                                <p className="mt-0.5 text-sm font-medium text-on-surface">
                                  {Number.isFinite(numeric)
                                    ? `${numeric} of ${Math.round(Number(candidate.score))} pts`
                                    : "Available"}
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    <div className="mt-4 rounded-lg bg-surface-container-lowest p-3 text-sm text-on-surface-variant">
                      <p>
                        Rate: {money(profile?.hourlyRate)}{" "}
                        {profile?.hourlyRateCurrency ?? ""} / hour · assessment:{" "}
                        {score(profile?.assessmentScore)}
                      </p>
                      <p className="mt-1">
                        {profile?.completedTasks ?? 0} completed ·{" "}
                        {profile?.onTimeDeliveries ?? 0} on time ·{" "}
                        {profile?.missedDeadlines ?? 0} missed
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(profile?.topSkills ?? []).slice(0, 8).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-primary-container/10 px-2.5 py-1 text-xs text-primary-container"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {candidate.rationale && (
                      <p className="mt-4 text-sm text-on-surface-variant">
                        <span className="font-medium text-on-surface">
                          Why this match:
                        </span>
                        {candidate.rationale}
                      </p>
                    )}

                    {(profile?.riskFlags.length ?? 0) > 0 && (
                      <div className="mt-4 flex gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
                        <ShieldAlert className="mt-0.5 shrink-0" size={16} />
                        {profile?.riskFlags.length} performance risk flag
                        {profile?.riskFlags.length === 1 ? "" : "s"} require
                        review.
                      </div>
                    )}

                    {profile && !profile.githubUsername && (
                      <p className="mt-4 rounded-lg bg-warning/10 p-3 text-sm text-on-surface-variant">
                        This profile cannot be invited until its GitHub username
                        is connected.
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      {profile?.githubUsername && (
                        <a
                          href={`https://github.com/${profile.githubUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-primary-container"
                        >
                          GitHub profile
                        </a>
                      )}
                      {profile?.cvUrl && (
                        <a
                          href={profile.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-primary-container"
                        >
                          View CV
                        </a>
                      )}
                    </div>

                    <Button
                      className="mt-5"
                      loading={working === `candidate:${candidate.id}`}
                      disabled={working !== null || !canSelect}
                      onClick={() => void selectCandidate(candidate.id)}
                    >
                      {canSelect
                        ? "Select and send invitation"
                        : isSelectedCandidate
                          ? "Selected"
                          : selectionFinished
                            ? "Selection complete"
                            : selectedMatchingRun.invitation?.candidateId ===
                                candidate.id
                              ? "Invitation sent"
                              : "Not currently selectable"}
                    </Button>
                  </article>
                );
              })}
            </div>

            {selectedMatchingRun.candidates.length === 0 && (
              <p className="mt-6 rounded-lg border border-dashed border-outline-variant p-5 text-sm text-on-surface-variant">
                No eligible profile was ranked. Operations must resolve the
                staffing blocker or rerun matching after the pool changes.
              </p>
            )}

            <Button
              className="mt-6 sm:w-auto"
              variant="outline"
              onClick={() => setSelectedMatchingRun(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {selectedSubmission && selectedSubmissionRecord && (
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
                  {text(selectedSubmissionRecord.title) || "Submission"}
                </h2>
              </div>
              <StatusBadge status={text(selectedSubmissionRecord.status)} />
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-on-surface-variant">
              {text(selectedSubmissionRecord.summary) ||
                "No freelancer summary was supplied."}
            </p>
            <SubmissionWorkEvidence
              detail={selectedSubmission}
              submission={selectedSubmissionRecord}
            />
            {selectedPullRequestReadiness &&
              !selectedApprovalBranchReady && (
              <div className="mt-5 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-on-surface">
                <p className="flex items-center gap-2 font-semibold">
                  <ShieldAlert size={16} /> Pull request needs integration
                  preparation
                </p>
                <p className="mt-1 text-on-surface-variant">
                    Current base: {text(selectedPullRequestReadiness.baseRef) ||
                      "unknown"}
                    {" · "}Required base: {text(
                      selectedPullRequestReadiness.requiredBaseRef,
                    )}
                </p>
                <p className="mt-2 text-on-surface-variant">
                  {text(selectedPullRequestReadiness.blocker)}
                </p>
                {Boolean(selectedPullRequestReadiness.error) && (
                  <p className="mt-2 text-xs text-error">
                    {text(selectedPullRequestReadiness.error)}
                  </p>
                )}
                {selectedPullRequestReadiness.canRetarget === true && (
                  <Button
                    className="mt-3 w-auto"
                    size="sm"
                    variant="outline"
                    loading={
                      working ===
                      `retarget:${text(selectedSubmissionRecord.id)}`
                    }
                      onClick={() =>
                        void retargetSelectedSubmissionPullRequest()
                      }
                  >
                    <RefreshCw size={16} /> Retarget and re-evaluate
                  </Button>
                )}
                {selectedPullRequestReadiness.targetReady === true &&
                  selectedPullRequestReadiness.historyReady === true &&
                  selectedPullRequestReadiness.evaluationCurrent !== true && (
                    <Button
                      className="mt-3 w-auto"
                      size="sm"
                      variant="outline"
                      loading={
                        working ===
                        `evaluation:${text(selectedSubmissionRecord.id)}`
                      }
                        onClick={() =>
                          void retrySelectedSubmissionEvaluation()
                        }
                    >
                      <RefreshCw size={16} /> Re-evaluate current base
                    </Button>
                  )}
              </div>
            )}
            {selectedEvaluationPending && (
              <div className="mt-5 rounded-lg border border-outline-variant/40 bg-surface-container-low p-4 text-sm text-on-surface">
                <p className="flex items-center gap-2 font-semibold">
                  <Loader2 size={16} className="animate-spin" /> AI evaluation
                  in progress
                </p>
                <p className="mt-1 text-on-surface-variant">
                  The rubric is shown below as pending. This review refreshes
                  automatically when the evaluation finishes.
                </p>
              </div>
            )}
            {selectedEvaluationRetryable && (
              <div className="mt-5 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-on-surface">
                <p className="flex items-center gap-2 font-semibold">
                  <ShieldAlert size={16} /> AI evaluation needs another run
                </p>
                <p className="mt-1 text-on-surface-variant">
                  Approval remains paused until an evaluation completes. Retry
                  it here without changing the freelancer submission.
                </p>
                <Button
                  className="mt-3 w-auto"
                  size="sm"
                  variant="outline"
                  loading={
                    working ===
                    `evaluation:${text(selectedSubmissionRecord.id)}`
                  }
                  onClick={() => void retrySelectedSubmissionEvaluation()}
                >
                  <RefreshCw size={16} /> Retry evaluation
                </Button>
              </div>
            )}
            {selectedSubmissionNeedsManualReview && (
              <div className="mt-5 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-on-surface">
                <p className="font-semibold">Human verification required</p>
                <p className="mt-1 text-on-surface-variant">
                  {selectedEvaluationRecommendation === "changes_requested"
                    ? "AI requested changes. If you disagree after rating every rubric row, inspect the exact pull request and commit, then record at least 20 characters explaining your approval evidence."
                    : "Automation could not inspect every relevant source file. This is not automatically a freelancer defect. Inspect the exact pull request and commit, then record at least 20 characters of review evidence before approving."}
                </p>
              </div>
            )}
            <div className="mt-5 space-y-3">
              {criteria.map((criterion, index) => (
                <div
                  key={criterion.key}
                  className="rounded-lg border border-outline-variant/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium text-on-surface">
                      {index + 1}. {criterion.criterion}
                    </p>
                    <StatusBadge status={criterion.status || "unmet"} />
                  </div>
                  {criterion.evidence && (
                    <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                      {criterion.evidence}
                    </p>
                  )}
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
              {criteria.length === 0 && selectedEvaluationReady && (
                <p className="rounded-lg bg-warning/10 p-3 text-sm text-on-surface-variant">
                  The completed evaluation returned no applicable rubric rows.
                  Retry the evaluation before making an approval decision.
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                disabled={
                  !selectedEvaluationReady ||
                  !selectedApprovalBranchReady ||
                  working !== null
                }
                title={
                  !selectedApprovalBranchReady
                    ? text(selectedPullRequestReadiness?.blocker)
                    : selectedEvaluationReady
                      ? undefined
                      : "Approval becomes available when AI evaluation completes"
                }
                onClick={() => void decideSubmission("approved")}
              >
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

function Metric({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg border border-outline-variant/20 px-2.5 py-2 text-on-surface-variant">
      {icon}
      {label}
    </span>
  );
}

function roleLabel(role: string | null) {
  if (role?.startsWith("implementation_")) {
    const position = Number(role.slice("implementation_".length));
    return Number.isFinite(position)
      ? `Implementation freelancer ${position}`
      : "Implementation freelancer";
  }
  const labels: Record<string, string> = {
    architect: "Solution architect",
    ui_ux: "UI/UX designer",
    frontend: "Frontend developer",
    backend: "Backend developer",
    fullstack: "Full-stack developer",
    qa: "Quality engineer",
    implementation: "Implementation freelancer",
  };
  return labels[role ?? ""] ?? (role?.replaceAll("_", " ") || "Project role");
}

function money(value: number | null | undefined) {
  return value == null
    ? "Not set"
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
        value,
      );
}

function score(value: number | null | undefined) {
  return value == null ? "not scored" : `${Math.round(value)}/100`;
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
  onOpen,
  openLabel = "Open",
  approveDisabledReason,
  approveLabel = "Approve",
  changesLabel = "Request changes",
}: {
  title: string;
  status: string;
  detail: string;
  working: boolean;
  onApprove: () => void;
  onChanges: () => void;
  /** Opens the full deliverable. Rows without it behave as before. */
  onOpen?: () => void;
  openLabel?: string;
  /** When set, Approve is disabled and this explains why. ISSUES.md #30. */
  approveDisabledReason?: string;
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
        {approveDisabledReason && (
          <p className="mt-1 text-xs text-on-surface-variant">
            {approveDisabledReason}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {onOpen && (
          <Button
            size="sm"
            variant="outline"
            disabled={working}
            onClick={onOpen}
          >
            {openLabel}
          </Button>
        )}
        <Button
          size="sm"
          loading={working}
          disabled={Boolean(approveDisabledReason)}
          title={approveDisabledReason}
          onClick={onApprove}
        >
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

function submissionRecord(detail: Row | null): Row | null {
  if (!detail) return null;
  return detail.submission && typeof detail.submission === "object"
    ? (detail.submission as Row)
    : detail;
}

function evaluationNeedsManualReview(evaluation: Row | null) {
  if (!evaluation) return false;
  return ["manual_review", "changes_requested"].includes(
    text(evaluation.recommendation),
  );
}

function submissionPullRequestReadiness(submission: Row | null): Row | null {
  if (!submission?.reviewRequirements) return null;
  const requirements = submission.reviewRequirements as Row;
  return requirements.pullRequest &&
    typeof requirements.pullRequest === "object"
    ? (requirements.pullRequest as Row)
    : null;
}

function submissionCriteria(submission: Row | null): Criterion[] {
  const evaluation = latestEvaluation(submission);
  const coverage =
    evaluation?.acceptanceCoverage &&
    typeof evaluation.acceptanceCoverage === "object"
      ? (evaluation.acceptanceCoverage as Row)
      : null;
  const items = Array.isArray(coverage?.items) ? (coverage.items as Row[]) : [];
  const rubricSnapshot =
    coverage?.rubricSnapshot && typeof coverage.rubricSnapshot === "object"
      ? (coverage.rubricSnapshot as Row)
      : null;
  const frozenCriteria = Array.isArray(rubricSnapshot?.criteria)
    ? (rubricSnapshot.criteria as Row[])
    : [];
  const requirements =
    submission?.reviewRequirements &&
    typeof submission.reviewRequirements === "object"
      ? (submission.reviewRequirements as Row)
      : null;
  const canonicalCriteria = Array.isArray(requirements?.criteria)
    ? (requirements.criteria as Row[])
    : [];
  if (canonicalCriteria.length) {
    return canonicalCriteria.flatMap((criterion) => {
      const key = text(criterion.criterionKey);
      const label = text(criterion.criterion);
      if (!key || !label) return [];
      const evaluated = items.find((item) => text(item.key) === key);
      return [
        {
          key,
          criterion: label,
          category: text(evaluated?.category),
          status: text(evaluated?.status) || "pending",
          evidence: text(evaluated?.evidence),
        },
      ];
    });
  }
  const rows: Row[] = items.length
    ? items
    : frozenCriteria.map((criterion) => ({
        ...criterion,
        status: "pending",
        evidence: "Evaluation pending",
      }));
  return rows.flatMap((item, index) => {
    if (text(item.status) === "not_applicable" || !text(item.criterion))
      return [];
    return [
      {
        key: text(item.key) || `criterion_${index + 1}`,
        criterion: text(item.criterion),
        category: text(item.category),
        status: text(item.status),
        evidence: text(item.evidence),
      },
    ];
  });
}

function SubmissionWorkEvidence({
  detail,
  submission,
}: {
  detail: Row;
  submission: Row;
}) {
  const repository =
    detail.repository && typeof detail.repository === "object"
      ? (detail.repository as Row)
      : null;
  const pullRequestUrl = text(submission.pullRequestUrl);
  const repositoryUrl = text(submission.repoUrl) || text(repository?.repoUrl);
  const commitSha = text(submission.commitSha);
  const branchName = text(submission.branchName);
  const hasEvidence = Boolean(
    pullRequestUrl || repositoryUrl || commitSha || branchName,
  );

  return (
    <section className="mt-5 rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
      <h3 className="text-sm font-semibold text-on-surface">The work</h3>
      {hasEvidence ? (
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {isHttpUrl(pullRequestUrl) && (
            <div>
              <dt className="text-xs text-on-surface-variant">Pull request</dt>
              <dd>
                <a
                  href={pullRequestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary-container hover:underline"
                >
                  Open exact pull request
                </a>
              </dd>
            </div>
          )}
          {isHttpUrl(repositoryUrl) && (
            <div>
              <dt className="text-xs text-on-surface-variant">Repository</dt>
              <dd>
                <a
                  href={repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary-container hover:underline"
                >
                  Open repository
                </a>
              </dd>
            </div>
          )}
          {commitSha && (
            <div>
              <dt className="text-xs text-on-surface-variant">Commit</dt>
              <dd className="break-all font-mono text-xs text-on-surface">
                {commitSha}
              </dd>
            </div>
          )}
          {branchName && (
            <div>
              <dt className="text-xs text-on-surface-variant">Branch</dt>
              <dd className="break-all font-mono text-xs text-on-surface">
                {branchName}
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-on-surface-variant">
          This submission does not include repository, pull-request, commit, or
          branch evidence.
        </p>
      )}
    </section>
  );
}
