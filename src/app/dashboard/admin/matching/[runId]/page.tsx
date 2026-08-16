"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Lock,
  Loader2,
  RefreshCw,
  Sparkles,
  UserCheck,
  XCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { getAgentJobDetail } from "@/services/admin";
import {
  getProjectMatchingRuns,
  getProjectRoleAssignments,
  getRunDetail,
  reviewMatchingRun,
  type MatchingCandidate,
  type MatchingRun,
  type RoleAssignment,
  type RunDetail,
} from "@/services/matching";
import {
  generateProjectPlan,
  getProjectPlans,
  getProjectSubmissions,
  type PlanningSubmission,
  type ProjectPlan,
} from "@/services/planning";

type Decision = "approved" | "rejected" | "rerun_required";
type WorkflowStep = "architect" | "ui_ux" | "submissions" | "scrum_plan" | "escrow";
type AdminRunDetail = RunDetail & { projectTitle?: string | null };

const stepLabels: Record<WorkflowStep, string> = {
  architect: "Choose architect",
  ui_ux: "Choose UI/UX",
  submissions: "Review deliverables",
  scrum_plan: "Scrum plan",
  escrow: "Escrow",
};

const RISK_LABELS: Record<string, string> = {
  no_availability: "No availability",
  below_min_availability: "Below minimum availability",
  over_max_rate: "Over budget",
  missing_required_skills: "Missing required skills",
  low_assessment_score: "Low skill score",
};

function riskLabel(flag: string) {
  return RISK_LABELS[flag] ?? flag.replace(/_/g, " ");
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function skillBadges(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { skill: item, score: null };
      }
      if (item && typeof item === "object" && "skill" in item) {
        const skill = String((item as { skill?: unknown }).skill ?? "").trim();
        const score = numberValue((item as { score?: unknown }).score);
        return skill ? { skill, score } : null;
      }
      return null;
    })
    .filter((item): item is { skill: string; score: number | null } =>
      Boolean(item),
    );
}

function fulfilledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function failedRequestLabels(
  results: Array<{ label: string; result: PromiseSettledResult<unknown> }>,
) {
  return results
    .filter(({ result }) => result.status === "rejected")
    .map(({ label }) => label);
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function roleLabel(role?: string | null) {
  if (!role) return "Planning role";
  if (role === "ui_ux" || role === "uiux") return "UI/UX";
  if (role === "architect" || role === "architecture") return "Architect";
  return role.replace(/_/g, " ");
}

function findRun(runs: MatchingRun[], role: "architect" | "ui_ux") {
  const keys =
    role === "architect"
      ? ["architect", "architecture"]
      : ["ui_ux", "uiux", "designer"];

  return runs.find((run) =>
    keys.includes(String(run.targetRoleKey ?? "").toLowerCase()),
  );
}

function runMatchesRole(
  run: MatchingRun | null | undefined,
  role: "architect" | "ui_ux",
) {
  if (!run) return false;
  return findRun([run], role)?.id === run.id;
}

function findAssignment(assignments: RoleAssignment[], role: "architect" | "ui_ux") {
  const keys =
    role === "architect"
      ? ["architect", "architecture"]
      : ["ui_ux", "uiux", "designer"];

  return assignments.find(
    (assignment) =>
      assignment.phase === "planning" &&
      keys.includes(String(assignment.roleKey ?? "").toLowerCase()) &&
      ["assigned", "accepted", "in_progress", "completed"].includes(
        assignment.status,
      ),
  );
}

function isRoleDone(run?: MatchingRun, assignment?: RoleAssignment) {
  return (
    Boolean(assignment) ||
    run?.status === "approved" ||
    (run?.status === "reviewed" && Boolean(run.selectedCandidateId))
  );
}

function isSubmissionApproved(
  submissions: PlanningSubmission[],
  type: "architecture" | "ui_ux",
) {
  return submissions.some(
    (submission) =>
      submission.submissionType === type && submission.status === "approved",
  );
}

function latestSubmission(
  submissions: PlanningSubmission[],
  type: "architecture" | "ui_ux",
) {
  return submissions
    .filter((submission) => submission.submissionType === type)
    .sort(
      (a, b) =>
        new Date(b.submittedAt ?? b.reviewedAt ?? 0).getTime() -
        new Date(a.submittedAt ?? a.reviewedAt ?? 0).getTime(),
    )[0];
}

function stepStyle(done: boolean, active: boolean, locked: boolean) {
  if (done) {
    return "border-primary-container bg-primary-container text-on-primary";
  }
  if (active) {
    return "border-primary-container bg-primary-container/10 text-primary-container";
  }
  if (locked) {
    return "border-outline-variant bg-surface-container-high text-outline";
  }
  return "border-outline-variant bg-surface-container-lowest text-on-surface-variant";
}

export default function AdminMatchingDetail() {
  const { runId } = useParams<{ runId: string }>();
  const toast = useToast();
  const [initialRun, setInitialRun] = useState<AdminRunDetail | null>(null);
  const [runs, setRuns] = useState<MatchingRun[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [submissions, setSubmissions] = useState<PlanningSubmission[]>([]);
  const [plans, setPlans] = useState<ProjectPlan[]>([]);
  const [selectedRunDetail, setSelectedRunDetail] =
    useState<AdminRunDetail | null>(null);
  const [activeStep, setActiveStep] = useState<WorkflowStep>("architect");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [planGenerationJobId, setPlanGenerationJobId] = useState<string | null>(
    null,
  );

  const loadProjectFlow = useCallback(async () => {
    if (!runId) return;
    setLoading(true);

    try {
      const run = (await getRunDetail(runId)) as AdminRunDetail;
      setInitialRun(run);

      const [runsResult, assignmentsResult, submissionsResult, plansResult] =
        await Promise.allSettled([
          getProjectMatchingRuns(run.projectId),
          getProjectRoleAssignments(run.projectId),
          getProjectSubmissions(run.projectId, { limit: 100 }),
          getProjectPlans(run.projectId, { limit: 100 }),
        ]);

      const projectRuns = fulfilledValue(runsResult, [] as MatchingRun[]);
      const projectAssignments = fulfilledValue(
        assignmentsResult,
        [] as RoleAssignment[],
      );
      const projectSubmissions = fulfilledValue(
        submissionsResult,
        [] as PlanningSubmission[],
      );
      const projectPlans = fulfilledValue(plansResult, [] as ProjectPlan[]);
      const flowRuns = projectRuns.some((projectRun) => projectRun.id === run.id)
        ? projectRuns
        : [run, ...projectRuns];
      const failedLabels = failedRequestLabels([
        { label: "matching runs", result: runsResult },
        { label: "role assignments", result: assignmentsResult },
        { label: "planning submissions", result: submissionsResult },
        { label: "scrum plans", result: plansResult },
      ]);

      setRuns(flowRuns);
      setAssignments(projectAssignments);
      setSubmissions(projectSubmissions);
      setPlans(projectPlans);

      if (failedLabels.length) {
        toast.info(
          "Workflow partially loaded",
          `Still waiting on ${failedLabels.join(", ")}. The available checkpoint data is shown.`,
        );
      }

      const architectRun = findRun(flowRuns, "architect");
      const uiuxRun = findRun(flowRuns, "ui_ux");
      const architectAssignment = findAssignment(projectAssignments, "architect");
      const uiuxAssignment = findAssignment(projectAssignments, "ui_ux");
      const architectDone = isRoleDone(architectRun, architectAssignment);
      const uiuxDone = isRoleDone(uiuxRun, uiuxAssignment);
      const architectureApproved = isSubmissionApproved(
        projectSubmissions,
        "architecture",
      );
      const uiuxApproved = isSubmissionApproved(projectSubmissions, "ui_ux");
      const approvedPlan = projectPlans.find((plan) => plan.status === "approved");

      if (!architectDone) {
        setActiveStep("architect");
        setSelectedRunDetail(
          architectRun?.id === run.id
            ? run
            : architectRun
              ? ((await getRunDetail(architectRun.id)) as AdminRunDetail)
              : runMatchesRole(run, "architect")
                ? run
                : null,
        );
      } else if (!uiuxDone) {
        setActiveStep("ui_ux");
        setSelectedRunDetail(
          uiuxRun?.id === run.id
            ? run
            : uiuxRun
              ? ((await getRunDetail(uiuxRun.id)) as AdminRunDetail)
              : runMatchesRole(run, "ui_ux")
                ? run
                : null,
        );
      } else if (!architectureApproved || !uiuxApproved) {
        setActiveStep("submissions");
        setSelectedRunDetail(null);
      } else if (!approvedPlan) {
        setActiveStep("scrum_plan");
        setSelectedRunDetail(null);
      } else {
        setActiveStep("escrow");
        setSelectedRunDetail(null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load project workflow";
      toast.error("Could not load project workflow", message);
    } finally {
      setLoading(false);
    }
  }, [runId, toast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProjectFlow();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProjectFlow]);

  useEffect(() => {
    if (!planGenerationJobId || !initialRun?.projectId) return;
    let cancelled = false;
    let timeoutId: number | undefined;

    const poll = async () => {
      try {
        const job = await getAgentJobDetail(planGenerationJobId);
        if (cancelled) return;

        if (job.status === "completed") {
          const generatedPlans = await getProjectPlans(initialRun.projectId, {
            limit: 100,
          });
          if (cancelled) return;
          setPlans(generatedPlans);
          setPlanGenerationJobId(null);
          toast.success(
            "Scrum plan ready",
            "The generated plan is ready for admin review.",
          );
          return;
        }
        if (job.status === "failed") {
          setPlanGenerationJobId(null);
          toast.error(
            "Scrum Master failed",
            job.error || "The plan could not be generated after retrying.",
          );
          return;
        }
      } catch {
        // A transient polling failure should not cancel the queued job.
      }
      if (!cancelled) timeoutId = window.setTimeout(poll, 4_000);
    };

    timeoutId = window.setTimeout(poll, 1_000);
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [initialRun?.projectId, planGenerationJobId, toast]);

  const projectId = initialRun?.projectId;
  const projectTitle =
    initialRun?.projectTitle || `Project ${projectId?.slice(0, 8) ?? ""}`;
  const architectRun = useMemo(() => findRun(runs, "architect"), [runs]);
  const uiuxRun = useMemo(() => findRun(runs, "ui_ux"), [runs]);
  const architectAssignment = useMemo(
    () => findAssignment(assignments, "architect"),
    [assignments],
  );
  const uiuxAssignment = useMemo(
    () => findAssignment(assignments, "ui_ux"),
    [assignments],
  );
  const architectDone = isRoleDone(architectRun, architectAssignment);
  const uiuxDone = isRoleDone(uiuxRun, uiuxAssignment);
  const architectureSubmission = latestSubmission(submissions, "architecture");
  const uiuxSubmission = latestSubmission(submissions, "ui_ux");
  const architectureApproved = isSubmissionApproved(submissions, "architecture");
  const uiuxApproved = isSubmissionApproved(submissions, "ui_ux");
  const latestPlan = [...plans].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
  const approvedPlan = plans.find((plan) => plan.status === "approved");
  const submissionsUnlocked = architectDone && uiuxDone;
  const scrumUnlocked = submissionsUnlocked && architectureApproved && uiuxApproved;
  const escrowUnlocked = Boolean(approvedPlan);

  const steps: Array<{
    key: WorkflowStep;
    done: boolean;
    active: boolean;
    locked: boolean;
    meta: string;
  }> = [
    {
      key: "architect",
      done: architectDone,
      active: activeStep === "architect",
      locked: false,
      meta: architectRun ? roleLabel(architectRun.targetRoleKey) : "Not queued",
    },
    {
      key: "ui_ux",
      done: uiuxDone,
      active: activeStep === "ui_ux",
      locked: !architectDone,
      meta: uiuxRun ? roleLabel(uiuxRun.targetRoleKey) : "Waiting",
    },
    {
      key: "submissions",
      done: architectureApproved && uiuxApproved,
      active: activeStep === "submissions",
      locked: !submissionsUnlocked,
      meta: `${submissions.length} deliverables`,
    },
    {
      key: "scrum_plan",
      done: Boolean(approvedPlan),
      active: activeStep === "scrum_plan",
      locked: !scrumUnlocked,
      meta: latestPlan ? `v${latestPlan.version}` : "Not generated",
    },
    {
      key: "escrow",
      done: false,
      active: activeStep === "escrow",
      locked: !escrowUnlocked,
      meta: escrowUnlocked ? "Ready" : "Locked",
    },
  ];

  const chooseStep = async (step: WorkflowStep) => {
    if (step === "ui_ux" && !architectDone) return;
    if (step === "submissions" && !submissionsUnlocked) return;
    if (step === "scrum_plan" && !scrumUnlocked) return;
    if (step === "escrow" && !escrowUnlocked) return;

    setActiveStep(step);
    if (step === "architect" && architectRun) {
      setSelectedRunDetail(
        architectRun.id === selectedRunDetail?.id
          ? selectedRunDetail
          : ((await getRunDetail(architectRun.id)) as AdminRunDetail),
      );
    } else if (step === "ui_ux" && uiuxRun) {
      setSelectedRunDetail(
        uiuxRun.id === selectedRunDetail?.id
          ? selectedRunDetail
          : ((await getRunDetail(uiuxRun.id)) as AdminRunDetail),
      );
    } else {
      setSelectedRunDetail(null);
    }
  };

  async function decide(input: {
    decision: Decision;
    selectedCandidateId?: string;
    run?: MatchingRun | AdminRunDetail | null;
  }) {
    const run = input.run ?? selectedRunDetail;
    if (!run) return;

    const key = `${run.id}:${input.decision}:${input.selectedCandidateId ?? "run"}`;
    setActionLoading(key);
    try {
      await reviewMatchingRun(run.id, {
        decision: input.decision,
        selectedCandidateId: input.selectedCandidateId,
        createAssignment: input.decision === "approved",
        notes:
          input.decision === "approved"
            ? "Approved from project workflow review."
            : input.decision === "rerun_required"
              ? "Admin requested another matching run."
              : "Rejected from project workflow review.",
      });
      toast.success(
        input.decision === "approved"
          ? "Planning role assigned"
          : "Matching run updated",
        input.decision === "approved"
          ? "The next checkpoint is now available when its prerequisite is met."
          : "The run status was saved.",
      );
      await loadProjectFlow();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save review";
      toast.error("Review failed", message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGeneratePlan() {
    if (!projectId || !architectureSubmission || !uiuxSubmission) return;
    setActionLoading("generate-plan");
    try {
      const result = await generateProjectPlan(projectId, {
        architectureSubmissionId: architectureSubmission.id,
        uiuxSubmissionId: uiuxSubmission.id,
        mode: "async",
      });
      const agentJobId =
        typeof result.agentJobId === "string" ? result.agentJobId : null;
      if (agentJobId) setPlanGenerationJobId(agentJobId);
      toast.success(
        agentJobId ? "Scrum Master queued" : "Scrum plan is up to date",
        agentJobId
          ? "Generation is running in the background. This page will update automatically."
          : "A plan already exists for the approved deliverables.",
      );
      await loadProjectFlow();
    } catch (error) {
      toast.error(
        "Could not generate plan",
        error instanceof Error ? error.message : "The Scrum Master job could not start.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <DashboardShell
      role="admin"
      title="Project Workflow"
      subtitle={`Reviewing ${projectTitle}`}
    >
      <Link
        href="/dashboard/admin/matching"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary-container"
      >
        <ArrowLeft size={16} />
        Back to projects
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      ) : !initialRun ? (
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          Project workflow was not found.
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-headline text-2xl font-semibold text-on-surface">
                    {projectTitle}
                  </h2>
                  <StatusBadge status={initialRun.status} />
                </div>
                <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
                  The flow is intentionally gated: select the architect, then
                  UI/UX, then review both deliverables before the Scrum Master
                  generates the plan.
                </p>
              </div>
              <div className="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                Project ID
                <span className="ml-2 font-mono text-on-surface">
                  {initialRun.projectId.slice(0, 8)}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-5">
              {steps.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => void chooseStep(step.key)}
                  disabled={step.locked}
                  className={`rounded-xl border p-4 text-left transition ${
                    step.active
                      ? "border-primary-container bg-primary-container/10"
                      : step.locked
                        ? "border-outline-variant/30 bg-surface-container-low text-on-surface-variant"
                        : "border-outline-variant/40 bg-surface-container-lowest hover:border-primary-container/40 hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${stepStyle(
                        step.done,
                        step.active,
                        step.locked,
                      )}`}
                    >
                      {step.done ? (
                        <CheckCircle2 size={16} />
                      ) : step.locked ? (
                        <Lock size={15} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-on-surface">
                        {stepLabels[step.key]}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                        {step.meta}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {activeStep === "architect" || activeStep === "ui_ux" ? (
            <RoleSelectionPanel
              role={activeStep}
              run={activeStep === "architect" ? architectRun : uiuxRun}
              assignment={
                activeStep === "architect" ? architectAssignment : uiuxAssignment
              }
              detail={selectedRunDetail}
              locked={activeStep === "ui_ux" && !architectDone}
              actionLoading={actionLoading}
              onRerun={(run) => decide({ decision: "rerun_required", run })}
              onReject={(run) => decide({ decision: "rejected", run })}
              onApprove={(run, candidateId) =>
                decide({
                  decision: "approved",
                  selectedCandidateId: candidateId,
                  run,
                })
              }
            />
          ) : null}

          {activeStep === "submissions" ? (
            <SubmissionsPanel
              locked={!submissionsUnlocked}
              architectureSubmission={architectureSubmission}
              uiuxSubmission={uiuxSubmission}
              architectureApproved={architectureApproved}
              uiuxApproved={uiuxApproved}
            />
          ) : null}

          {activeStep === "scrum_plan" ? (
            <ScrumPlanPanel
              locked={!scrumUnlocked}
              plans={plans}
              latestPlan={latestPlan}
              onGenerate={handleGeneratePlan}
              generating={
                actionLoading === "generate-plan" ||
                Boolean(planGenerationJobId)
              }
            />
          ) : null}

          {activeStep === "escrow" ? (
            <EscrowPanel locked={!escrowUnlocked} />
          ) : null}
        </div>
      )}
    </DashboardShell>
  );
}

function RoleSelectionPanel({
  role,
  run,
  assignment,
  detail,
  locked,
  actionLoading,
  onApprove,
  onReject,
  onRerun,
}: {
  role: "architect" | "ui_ux";
  run?: MatchingRun;
  assignment?: RoleAssignment;
  detail: AdminRunDetail | null;
  locked: boolean;
  actionLoading: string | null;
  onApprove: (run: MatchingRun | AdminRunDetail, candidateId: string) => void;
  onReject: (run: MatchingRun | AdminRunDetail) => void;
  onRerun: (run: MatchingRun | AdminRunDetail) => void;
}) {
  if (locked) {
    return (
      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center card-shadow">
        <Lock className="mx-auto h-8 w-8 text-outline" />
        <h3 className="mt-3 font-headline text-xl font-semibold text-on-surface">
          UI/UX unlocks after architect approval
        </h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          This keeps the planning sequence clean and avoids starting UI/UX review
          before the architecture owner is selected.
        </p>
      </section>
    );
  }

  if (!run) {
    return (
      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center card-shadow">
        <Clock3 className="mx-auto h-8 w-8 text-outline" />
        <h3 className="mt-3 font-headline text-xl font-semibold text-on-surface">
          No {roleLabel(role)} run yet
        </h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          The matching agent needs to create candidates for this role.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
      <div className="flex flex-col gap-3 border-b border-outline-variant/20 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-headline text-xl font-semibold text-on-surface">
              {stepLabels[role]}
            </h3>
            <StatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            {assignment
              ? `${roleLabel(role)} is already assigned. Candidate actions are locked for this role.`
              : detail?.summary ||
              "Review the ranked shortlist and assign the best planning freelancer."}
          </p>
        </div>
        {assignment ? (
          <StatusBadge status={assignment.status} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="!w-auto rounded-full px-3 py-2 text-xs"
              loading={actionLoading === `${run.id}:rerun_required:run`}
              onClick={() => onRerun(run)}
            >
              <RefreshCw size={14} />
              Rerun
            </Button>
            <Button
              type="button"
              variant="outline"
              className="!w-auto rounded-full border-error/30 px-3 py-2 text-xs text-error hover:bg-error/10"
              loading={actionLoading === `${run.id}:rejected:run`}
              onClick={() => onReject(run)}
            >
              <XCircle size={14} />
              Reject run
            </Button>
          </div>
        )}
      </div>

      {assignment ? <AssignedRoleCard role={role} assignment={assignment} /> : null}

      <div className="mt-5 space-y-3">
        {detail?.candidates?.length ? (
          detail.candidates.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              run={run}
              candidate={candidate}
              assignment={assignment}
              actionLoading={actionLoading}
              onApprove={onApprove}
            />
          ))
        ) : (
          <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
            No candidates were returned for this role.
          </p>
        )}
      </div>
    </section>
  );
}

function AssignedRoleCard({
  role,
  assignment,
}: {
  role: "architect" | "ui_ux";
  assignment: RoleAssignment;
}) {
  const freelancerName = assignment.freelancer?.name || "Assigned freelancer";
  const topSkills = skillBadges(assignment.freelancer?.topSkills).slice(0, 4);

  return (
    <div className="mt-5 rounded-xl border border-primary-container/20 bg-primary-container/10 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-on-primary">
            <UserCheck size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
              Assigned {roleLabel(role)}
            </p>
            <h4 className="truncate font-headline text-lg font-semibold text-on-surface">
              {freelancerName}
            </h4>
            <p className="truncate text-sm text-on-surface-variant">
              {assignment.freelancer?.headline || "Planning freelancer"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={assignment.status} />
          <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-medium text-on-surface-variant">
            Assigned {formatDate(assignment.assignedAt)}
          </span>
        </div>
      </div>
      {topSkills.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {topSkills.map((skill) => (
            <span
              key={skill.skill}
              className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-xs font-medium text-primary-container"
            >
              {skill.skill}
              {skill.score != null && Number.isFinite(skill.score)
                ? ` ${skill.score.toFixed(1)}`
                : ""}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CandidateRow({
  run,
  candidate,
  assignment,
  actionLoading,
  onApprove,
}: {
  run: MatchingRun;
  candidate: MatchingCandidate;
  assignment?: RoleAssignment;
  actionLoading: string | null;
  onApprove: (run: MatchingRun, candidateId: string) => void;
}) {
  const evidence = candidate.evidence ?? {};
  const score = Number(candidate.score ?? 0);
  const hourlyRate = numberValue(evidence.hourlyRate);
  const availabilityHours =
    numberValue(evidence.availabilityHours) ??
    candidate.freelancer?.availabilityHours ??
    0;
  const yearsExperience =
    numberValue(evidence.yearsExperience) ??
    candidate.freelancer?.yearsExperience ??
    0;
  const approveKey = `${run.id}:approved:${candidate.id}`;
  const assignedCandidate =
    assignment?.freelancerProfileId === candidate.freelancerProfileId;

  return (
    <div
      className={`rounded-xl border p-4 ${
        assignedCandidate
          ? "border-primary-container/30 bg-primary-container/10"
          : "border-outline-variant/30 bg-surface-container-low"
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-container/15 px-2.5 py-1 text-xs font-semibold text-primary-container">
              Rank #{candidate.rank}
            </span>
            <StatusBadge status={candidate.status} />
            {assignedCandidate ? <StatusBadge status="assigned" /> : null}
            <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-on-surface">
              {score.toFixed(1)} / 100
            </span>
          </div>
          <h4 className="mt-3 font-headline text-lg font-semibold text-on-surface">
            {candidate.freelancer?.name || "Freelancer"}
          </h4>
          <p className="text-sm text-on-surface-variant">
            {candidate.freelancer?.headline || "No headline yet"}
          </p>
          {candidate.rationale ? (
            <p className="mt-3 max-w-4xl text-sm leading-6 text-on-surface-variant">
              {candidate.rationale}
            </p>
          ) : null}
        </div>

        {assignment ? (
          <span className="inline-flex !w-full items-center justify-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 text-xs font-semibold text-on-surface-variant xl:!w-auto">
            {assignedCandidate ? <CheckCircle2 size={15} /> : <Lock size={15} />}
            {assignedCandidate ? "Assigned" : "Locked"}
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            className="!w-full rounded-full px-4 py-2 text-xs xl:!w-auto"
            loading={actionLoading === approveKey}
            disabled={run.status === "approved"}
            onClick={() => onApprove(run, candidate.id)}
          >
            <UserCheck size={15} />
            Assign
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-3 text-xs text-on-surface-variant sm:grid-cols-3">
        <div className="rounded-lg bg-surface-container-lowest p-3">
          <p>Rate</p>
          <p className="mt-1 text-sm font-semibold text-on-surface">
            {hourlyRate != null ? `$${hourlyRate}/hr` : "Not set"}
          </p>
        </div>
        <div className="rounded-lg bg-surface-container-lowest p-3">
          <p>Availability</p>
          <p className="mt-1 text-sm font-semibold text-on-surface">
            {availabilityHours} hrs/week
          </p>
        </div>
        <div className="rounded-lg bg-surface-container-lowest p-3">
          <p>Experience</p>
          <p className="mt-1 text-sm font-semibold text-on-surface">
            {yearsExperience} years
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {stringList(evidence.matchedSkills).map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-primary-container/15 px-2.5 py-1 text-xs font-medium text-primary-container"
          >
            {skill}
          </span>
        ))}
        {stringList(evidence.missingSkills).map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-surface-container-high px-2.5 py-1 text-xs text-on-surface-variant"
          >
            Missing {skill}
          </span>
        ))}
        {stringList(evidence.riskFlags).map((flag) => (
          <span
            key={flag}
            className="rounded-full bg-error/10 px-2.5 py-1 text-xs font-medium text-error"
          >
            {riskLabel(flag)}
          </span>
        ))}
      </div>
    </div>
  );
}

function SubmissionsPanel({
  locked,
  architectureSubmission,
  uiuxSubmission,
  architectureApproved,
  uiuxApproved,
}: {
  locked: boolean;
  architectureSubmission?: PlanningSubmission;
  uiuxSubmission?: PlanningSubmission;
  architectureApproved: boolean;
  uiuxApproved: boolean;
}) {
  if (locked) {
    return (
      <LockedPanel title="Deliverables are locked" description="Approve both planning roles before reviewing architecture and UI/UX submissions." />
    );
  }

  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
      <h3 className="font-headline text-xl font-semibold text-on-surface">
        Review planning deliverables
      </h3>
      <p className="mt-1 text-sm text-on-surface-variant">
        The Scrum Master unlocks only after both deliverables are approved.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SubmissionCard
          label="Architecture"
          submission={architectureSubmission}
          approved={architectureApproved}
        />
        <SubmissionCard
          label="UI/UX"
          submission={uiuxSubmission}
          approved={uiuxApproved}
        />
      </div>
    </section>
  );
}

function SubmissionCard({
  label,
  submission,
  approved,
}: {
  label: string;
  submission?: PlanningSubmission;
  approved: boolean;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-headline text-lg font-semibold text-on-surface">
            {label}
          </h4>
          <p className="mt-1 text-sm text-on-surface-variant">
            {submission?.title || "Waiting for freelancer submission"}
          </p>
        </div>
        <StatusBadge status={approved ? "approved" : submission?.status ?? "pending"} />
      </div>
      {submission?.summary ? (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-on-surface-variant">
          {submission.summary}
        </p>
      ) : null}
      <div className="mt-5">
        {submission ? (
          <Link href={`/dashboard/admin/planning/submissions/${submission.id}`}>
            <Button variant="outline" className="!w-auto px-4 py-2 text-sm">
              <FileText size={15} />
              Review deliverable
            </Button>
          </Link>
        ) : (
          <Button variant="outline" className="!w-auto px-4 py-2 text-sm" disabled>
            <Clock3 size={15} />
            Waiting
          </Button>
        )}
      </div>
    </div>
  );
}

function ScrumPlanPanel({
  locked,
  plans,
  latestPlan,
  onGenerate,
  generating,
}: {
  locked: boolean;
  plans: ProjectPlan[];
  latestPlan?: ProjectPlan;
  onGenerate: () => void;
  generating: boolean;
}) {
  if (locked) {
    return (
      <LockedPanel title="Scrum Master is locked" description="Approve both architecture and UI/UX deliverables before generating the project plan." />
    );
  }

  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-container">
            <Sparkles size={16} />
            Scrum Master
          </div>
          <h3 className="mt-2 font-headline text-xl font-semibold text-on-surface">
            Generate or review the implementation plan
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-on-surface-variant">
            This plan turns approved architecture and UI/UX into milestones,
            tasks, dependencies, and the customer-facing quote.
          </p>
        </div>
        <Button
          type="button"
          className="!w-auto px-4 py-2.5 text-sm"
          loading={generating}
          onClick={onGenerate}
        >
          <Sparkles size={16} />
          Generate plan
        </Button>
      </div>

      <div className="mt-5 rounded-xl border border-outline-variant/30 bg-surface-container-low p-5">
        {latestPlan ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-headline text-lg font-semibold text-on-surface">
                  Plan v{latestPlan.version}
                </h4>
                <StatusBadge status={latestPlan.status} />
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">
                {latestPlan.summary || `${plans.length} plan versions saved.`}
              </p>
            </div>
            <Link href={`/dashboard/admin/project-plans/${latestPlan.id}`}>
              <Button variant="outline" className="!w-auto px-4 py-2 text-sm">
                Review plan
                <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-on-surface-variant">
              No Scrum Master plan has been generated yet.
            </p>
            <Link href="/dashboard/admin/project-plans">
              <Button variant="outline" className="!w-auto px-4 py-2 text-sm">
                Admin plan workspace
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function EscrowPanel({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <LockedPanel title="Escrow is locked" description="Approve and materialize the Scrum Master plan before asking the customer to fund escrow." />
    );
  }

  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
      <h3 className="font-headline text-xl font-semibold text-on-surface">
        Escrow and customer funding
      </h3>
      <p className="mt-1 max-w-3xl text-sm text-on-surface-variant">
        The project can now move into customer funding. Review the final quote,
        payment state, and escrow holds before implementation starts.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/dashboard/admin/payments">
          <Button className="!w-auto px-4 py-2.5 text-sm">
            Admin escrow
            <ArrowRight size={15} />
          </Button>
        </Link>
      </div>
    </section>
  );
}

function LockedPanel({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center card-shadow">
      <Lock className="mx-auto h-8 w-8 text-outline" />
      <h3 className="mt-3 font-headline text-xl font-semibold text-on-surface">
        {title}
      </h3>
      <p className="mx-auto mt-1 max-w-xl text-sm text-on-surface-variant">
        {description}
      </p>
    </section>
  );
}
