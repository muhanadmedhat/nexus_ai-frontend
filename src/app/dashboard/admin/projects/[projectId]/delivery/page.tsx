"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  DeliveryEmpty,
  DeliveryRetryBanner,
  MilestoneTimeline,
  TaskList,
} from "@/components/delivery";
import { ProjectRepositoryPanel } from "@/components/delivery/project-repository-panel";
import { ImplementationMatchingPanel } from "@/components/delivery/implementation-matching-panel";
import { toNumber } from "@/components/delivery/helpers";
import {
  getMilestones,
  getProjectPlans,
  getProjectSubmissions,
  getTasks,
  type PlanningSubmission,
  type ProjectPlan,
  type ProjectMilestone,
} from "@/services/planning";
import {
  getProjectMatchingRuns,
  type MatchingRun,
} from "@/services/matching";
import { getProject } from "@/services/projects";
import { listDeliverySubmissions } from "@/services/project-submissions";
import { listRevisionRequests } from "@/services/revisions";
import { listProjectReleaseRequests } from "@/services/release-requests";
import {
  getProjectHandoff,
  retryProjectHandoff,
  type ProjectHandoffOverview,
} from "@/services/project-handoffs";
import { formatDate, formatMoney } from "@/utils/format";
import type { Project } from "@/types/project";
import type {
  DeliveryTask,
  PaymentReleaseRequest,
  ProjectRevisionRequest,
  ProjectSubmission,
} from "@/types/delivery";

/** Admin project delivery workspace for the complete automated lifecycle. */

function Section({
  id,
  index,
  title,
  description,
  children,
}: {
  id?: string;
  index: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-outline-variant/30 py-7">
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-xs text-on-surface-variant tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <h3 className="font-headline text-xl font-semibold text-on-surface">
          {title}
        </h3>
      </div>
      {description && (
        <p className="-mt-2 mb-4 text-sm text-on-surface-variant">
          {description}
        </p>
      )}
      {children}
    </section>
  );
}

interface LifecycleStage {
  label: string;
  detail: string;
  done: boolean;
  active: boolean;
}

function LifecycleTrace({ stages }: { stages: LifecycleStage[] }) {
  return (
    <ol className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
      {stages.map((stage, index) => (
        <li
          key={stage.label}
          className={`min-w-0 border-l-2 px-3 py-2 ${
            stage.done
              ? "border-primary-container"
              : stage.active
                ? "border-secondary bg-secondary-container/15"
                : "border-outline-variant"
          }`}
        >
          <div className="flex items-center gap-2">
            {stage.done ? (
              <CheckCircle2 size={16} className="shrink-0 text-primary-container" />
            ) : stage.active ? (
              <Clock3 size={16} className="shrink-0 text-secondary" />
            ) : (
              <Circle size={16} className="shrink-0 text-outline" />
            )}
            <span className="text-xs font-semibold text-on-surface">
              {index + 1}. {stage.label}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            {stage.detail}
          </p>
        </li>
      ))}
    </ol>
  );
}

const AUTOMATION_MESSAGES: Record<string, string> = {
  awaiting_requirements: "Waiting for enough confirmed scope to produce a reliable quote.",
  awaiting_quote: "Requirements changed; the client must confirm the updated quote.",
  awaiting_funding:
    "Quote is ready. Reviewer and planning-team matching happen before the planning package can be funded.",
  awaiting_principal_reviewer:
    "A principal reviewer invitation was sent and is waiting for a response.",
  matching_planning_team:
    "The principal reviewer accepted. UI/UX and architecture matching is starting.",
  awaiting_planning_team:
    "UI/UX or architecture invitations are pending; expired or declined invitations rematch automatically.",
  awaiting_implementation_team:
    "Implementation invitations are pending for the materialized tasks.",
  ready_for_funding_capacity_at_risk:
    "The planning team accepted, but planning payment is locked because the latest capacity sweep found too few available implementation freelancers.",
  ready_for_funding_capacity_at_risk_notified:
    "Planning payment is capacity-blocked. The client has been notified and the automatic sweep continues.",
  ready_for_funding_capacity_available:
    "The capacity sweep passed. Planning payment is unlocked and the client notification is being delivered.",
  ready_for_funding_capacity_available_notified:
    "The capacity sweep passed. Planning payment is unlocked and the client was emailed a payment link.",
  staffing_blocked:
    "Automatic staffing needs attention. Open the matching section for the failed or empty run.",
  awaiting_client_acceptance:
    "The integrated delivery is ready for the client’s final decision.",
};

async function withinLoadWindow<T>(promise: Promise<T>, label: string) {
  let timeout: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = window.setTimeout(
          () => reject(new Error(`${label} did not respond in time`)),
          10_000,
        );
      }),
    ]);
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
}

export default function AdminProjectDeliveryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const [project, setProject] = useState<Project | null>(null);
  const [matchingRuns, setMatchingRuns] = useState<MatchingRun[]>([]);
  const [planningSubmissions, setPlanningSubmissions] = useState<
    PlanningSubmission[]
  >([]);
  const [plans, setPlans] = useState<ProjectPlan[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [revisions, setRevisions] = useState<ProjectRevisionRequest[]>([]);
  const [releases, setReleases] = useState<PaymentReleaseRequest[]>([]);
  const [handoff, setHandoff] = useState<ProjectHandoffOverview | null>(null);
  const [retryingHandoff, setRetryingHandoff] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    Promise.allSettled([
      withinLoadWindow(getProject(projectId), "Project summary"),
      withinLoadWindow(
        getProjectMatchingRuns(projectId),
        "Team matching",
      ),
      withinLoadWindow(
        getProjectSubmissions(projectId, { limit: 100 }),
        "Planning deliverables",
      ),
      withinLoadWindow(
        getProjectPlans(projectId, { limit: 100 }),
        "Scrum plans",
      ),
      withinLoadWindow(getMilestones(projectId), "Milestones"),
      withinLoadWindow(getTasks(projectId, { limit: 200 }), "Tasks"),
      withinLoadWindow(
        listDeliverySubmissions(projectId),
        "Implementation submissions",
      ),
      withinLoadWindow(listRevisionRequests(projectId), "Revision requests"),
      withinLoadWindow(
        listProjectReleaseRequests(projectId),
        "Payment releases",
      ),
      withinLoadWindow(getProjectHandoff(projectId), "Final delivery"),
    ])
      .then(
        ([
          projectResult,
          matchingRunsResult,
          planningSubmissionsResult,
          plansResult,
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
          setMatchingRuns(
            matchingRunsResult.status === "fulfilled"
              ? matchingRunsResult.value
              : [],
          );
          setPlanningSubmissions(
            planningSubmissionsResult.status === "fulfilled"
              ? planningSubmissionsResult.value
              : [],
          );
          setPlans(plansResult.status === "fulfilled" ? plansResult.value : []);
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
          setHandoff(
            handoffResult.status === "fulfilled" ? handoffResult.value : null,
          );

          const failures: string[] = [];
          if (projectResult.status === "rejected")
            failures.push("project summary");
          if (matchingRunsResult.status === "rejected")
            failures.push("team matching");
          if (planningSubmissionsResult.status === "rejected")
            failures.push("planning deliverables");
          if (plansResult.status === "rejected") failures.push("Scrum plans");
          if (milestonesResult.status === "rejected")
            failures.push("milestones");
          if (tasksResult.status === "rejected") failures.push("tasks");
          if (submissionsResult.status === "rejected")
            failures.push("submissions");
          if (revisionsResult.status === "rejected")
            failures.push("revision requests");
          if (releasesResult.status === "rejected")
            failures.push("payment releases");
          if (handoffResult.status === "rejected") failures.push("final delivery");
          setLoadErrors(failures);
        },
      )
      .finally(() => setLoading(false));
  }, [projectId, reloadKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setReloadKey((key) => key + 1), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadErrors([]);
    setReloadKey((key) => key + 1);
  }, []);

  const unassigned = useMemo(
    () => tasks.filter((task) => !task.assignedFreelancerProfileId),
    [tasks],
  );

  // Tasks whose milestone is missing would otherwise never render, because the
  // timeline only shows tasks nested under a milestone it knows about.
  const unscheduledTasks = useMemo(() => {
    const milestoneIds = new Set(milestones.map((milestone) => milestone.id));
    return tasks.filter(
      (task) => !task.milestoneId || !milestoneIds.has(task.milestoneId),
    );
  }, [tasks, milestones]);

  const latestRunForRole = useCallback(
    (...roles: string[]) =>
      [...matchingRuns]
        .filter((run) => roles.includes(run.targetRoleKey))
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )[0],
    [matchingRuns],
  );
  const reviewerRun = latestRunForRole("principal_reviewer");
  const architectRun = latestRunForRole("architect", "architecture");
  const uiuxRun = latestRunForRole("ui_ux", "uiux", "designer");

  const latestPlanningSubmission = useCallback(
    (type: "architecture" | "ui_ux") =>
      [...planningSubmissions]
        .filter((submission) => submission.submissionType === type)
        .sort((left, right) => right.version - left.version)[0],
    [planningSubmissions],
  );
  const architectureSubmission = latestPlanningSubmission("architecture");
  const uiuxSubmission = latestPlanningSubmission("ui_ux");
  const currentPlan =
    plans.find((plan) => plan.isCurrent) ??
    [...plans].sort((left, right) => right.version - left.version)[0];

  const lifecycleStages = useMemo<LifecycleStage[]>(() => {
    const scopeDone = Boolean(
      project && !["draft", "brief_pending"].includes(project.status),
    );
    const runAccepted = (run?: MatchingRun) =>
      Boolean(
        run &&
          (["approved", "reviewed"].includes(run.status) ||
            run.selectedCandidateId),
      );
    const staffingDone =
      Boolean(architectureSubmission && uiuxSubmission) ||
      (runAccepted(reviewerRun) &&
        runAccepted(architectRun) &&
        runAccepted(uiuxRun));
    const planningDone =
      architectureSubmission?.status === "approved" &&
      uiuxSubmission?.status === "approved";
    const scrumDone =
      Boolean(currentPlan?.status === "approved") || tasks.length > 0;
    const implementationDone =
      tasks.length > 0 &&
      tasks.every((task) =>
        ["approved", "completed", "done"].includes(task.status),
      );
    const handoffDone = Boolean(
      handoff?.handoff &&
        ["approved", "accepted", "completed", "released"].includes(
          handoff.handoff.status,
        ),
    );
    const done = [
      scopeDone,
      staffingDone,
      planningDone,
      scrumDone,
      implementationDone,
      handoffDone,
    ];
    const activeIndex = done.findIndex((value) => !value);

    return [
      {
        label: "Scope",
        detail: scopeDone ? "Brief and quote ready" : "Brief still being defined",
        done: scopeDone,
        active: activeIndex === 0,
      },
      {
        label: "Team",
        detail: staffingDone ? "Planning team assigned" : "Reviewer or planning roles pending",
        done: staffingDone,
        active: activeIndex === 1,
      },
      {
        label: "Deliverables",
        detail: `${Number(architectureSubmission?.status === "approved") + Number(uiuxSubmission?.status === "approved")}/2 approved`,
        done: planningDone,
        active: activeIndex === 2,
      },
      {
        label: "Scrum plan",
        detail: currentPlan ? `Version ${currentPlan.version} · ${currentPlan.status.replaceAll("_", " ")}` : "Not generated",
        done: scrumDone,
        active: activeIndex === 3,
      },
      {
        label: "Implementation",
        detail: tasks.length ? `${tasks.filter((task) => ["approved", "completed", "done"].includes(task.status)).length}/${tasks.length} tasks complete` : "Tasks not created",
        done: implementationDone,
        active: activeIndex === 4,
      },
      {
        label: "Handoff",
        detail: handoff?.handoff?.status.replaceAll("_", " ") || "Waiting for implementation",
        done: handoffDone,
        active: activeIndex === 5,
      },
    ];
  }, [
    architectRun,
    architectureSubmission,
    currentPlan,
    handoff,
    project,
    reviewerRun,
    tasks,
    uiuxRun,
    uiuxSubmission,
  ]);

  const retryFinalDelivery = async () => {
    setRetryingHandoff(true);
    try {
      await retryProjectHandoff(projectId);
      toast.success("Final verification queued", "Integration will retry from the approved task commits.");
      refresh();
    } catch (error) {
      toast.error("Could not retry final delivery", error instanceof Error ? error.message : "Try again.");
    } finally {
      setRetryingHandoff(false);
    }
  };

  return (
    <DashboardShell
      role="admin"
      title={project?.title ?? "Project Workspace"}
      subtitle="One operational trace from scope and staffing through delivery and payment."
    >
      <Link
        href="/dashboard/admin/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary-container"
      >
        <ArrowLeft size={16} /> All projects
      </Link>

      {loading ? (
        <p className="text-sm text-on-surface-variant">
          Loading project workspace...
        </p>
      ) : (
        <div>
          {loadErrors.length > 0 && (
            <DeliveryRetryBanner
              title="Some sections could not be loaded"
              message={`Failed to load ${loadErrors.join(", ")}.`}
              onAction={refresh}
            />
          )}

          {project && (
            <section className="border-y border-outline-variant/30 bg-surface-container-lowest py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={project.status} />
                    {project.automationStatus && (
                      <StatusBadge status={project.automationStatus} />
                    )}
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant">
                    {AUTOMATION_MESSAGES[project.automationStatus ?? ""] ??
                      "Automation is progressing normally. This workspace refreshes as invitations, reviews, planning, and delivery move forward."}
                  </p>
                </div>
                <dl className="grid shrink-0 grid-cols-3 gap-5 text-sm">
                  <div>
                    <dt className="text-xs text-on-surface-variant">Milestones</dt>
                    <dd className="mt-1 font-semibold text-on-surface">{milestones.length}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-on-surface-variant">Tasks</dt>
                    <dd className="mt-1 font-semibold text-on-surface">
                      {tasks.length} <span className="font-normal text-on-surface-variant">· {unassigned.length} open</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-on-surface-variant">Submissions</dt>
                    <dd className="mt-1 font-semibold text-on-surface">{submissions.length}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-5 border-t border-outline-variant/30 pt-5">
                <LifecycleTrace stages={lifecycleStages} />
              </div>

              {project.implementationCapacitySnapshot && (
                <div className="mt-4 border-t border-outline-variant/30 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface">
                      Implementation capacity sweep
                    </span>
                    <StatusBadge
                      status={
                        project.implementationCapacitySnapshot.status ??
                        "unknown"
                      }
                    />
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {project.implementationCapacitySnapshot.workableCandidates ?? 0}{" "}
                    workable candidates for an estimated{" "}
                    {project.implementationCapacitySnapshot.requiredPeople ?? 0}-person
                    team.
                    {project.implementationCapacitySnapshot.checkedAt
                      ? ` Last checked ${formatDate(project.implementationCapacitySnapshot.checkedAt)}.`
                      : ""}
                  </p>
                  {project.implementationCapacitySnapshot.blockingReasons?.map(
                    (reason) => (
                      <p key={reason} className="mt-2 text-sm text-error">
                        {reason}
                      </p>
                    ),
                  )}
                </div>
              )}
            </section>
          )}

          <nav
            aria-label="Project workspace sections"
            className="sticky top-16 z-20 -mx-3 flex gap-1 overflow-x-auto border-b border-outline-variant/30 bg-background/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4 md:-mx-6 md:px-6"
          >
            {[
              ["planning", "Planning"],
              ["repository", "Repository"],
              ["implementation", "Implementation"],
              ["reviews", "Reviews"],
              ["payments", "Payments"],
              ["handoff", "Handoff"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={`#${href}`}
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              >
                {label}
              </a>
            ))}
          </nav>

          <Section
            id="planning"
            index={1}
            title="Planning team"
            description="Principal reviewer, architecture, and UI/UX matching for this project."
          >
            {matchingRuns.length ? (
              <div className="grid gap-3 lg:grid-cols-3">
                {(
                  [
                  ["Principal reviewer", reviewerRun],
                  ["Architect", architectRun],
                  ["UI/UX", uiuxRun],
                  ] as Array<[string, MatchingRun | undefined]>
                ).map(([label, matchingRun]) => {
                  return (
                    <div key={label} className="rounded-lg border border-outline-variant/30 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-on-surface">{label}</p>
                        {matchingRun ? <StatusBadge status={matchingRun.status} /> : null}
                      </div>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        {matchingRun
                          ? `${matchingRun.candidateCount} candidates${matchingRun.selectedCandidateId ? " · selection recorded" : ""}`
                          : "Matching has not started."}
                      </p>
                      {matchingRun ? (
                        <Link
                          href={`/dashboard/admin/matching/${matchingRun.id}`}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-container hover:underline"
                        >
                          Open matching run <ExternalLink size={13} />
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <DeliveryEmpty title="Team matching has not started" />
            )}
          </Section>

          <Section
            index={2}
            title="Planning deliverables"
            description="The latest architecture and UI/UX submissions and their review state."
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {(
                [
                  ["Architecture", architectureSubmission],
                  ["UI/UX", uiuxSubmission],
                ] as Array<[string, PlanningSubmission | undefined]>
              ).map(([label, planningSubmission]) => {
                return (
                  <div key={label} className="rounded-lg border border-outline-variant/30 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-on-surface">{label}</p>
                      {planningSubmission ? <StatusBadge status={planningSubmission.status} /> : null}
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      {planningSubmission
                        ? `${planningSubmission.title || `${label} deliverable`} · Version ${planningSubmission.version}`
                        : "No submission yet."}
                    </p>
                    {planningSubmission ? (
                      <Link
                        href={`/dashboard/admin/planning/submissions/${planningSubmission.id}`}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-container hover:underline"
                      >
                        Open deliverable <ExternalLink size={13} />
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section
            index={3}
            title="Scrum plan"
            description="The current approved plan is the source for materialized milestones and tasks."
          >
            {currentPlan ? (
              <div className="flex flex-col gap-4 rounded-lg border border-outline-variant/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-on-surface">Version {currentPlan.version}</p>
                    <StatusBadge status={currentPlan.status} />
                    {currentPlan.isCurrent ? (
                      <span className="text-xs font-semibold text-primary-container">Current</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {currentPlan.milestones?.length ?? milestones.length} planned
                    milestones · {currentPlan.tasks?.length ?? tasks.length} planned
                    tasks
                  </p>
                </div>
                <Link
                  href={`/dashboard/admin/project-plans/${currentPlan.id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
                >
                  Open Scrum plan <ExternalLink size={14} />
                </Link>
              </div>
            ) : (
              <DeliveryEmpty title="Scrum plan has not been generated" />
            )}
          </Section>

          <Section
            id="repository"
            index={4}
            title="Repository"
            description="One Nexus-owned private repository per project, plus collaborator invites."
          >
            <ProjectRepositoryPanel projectId={projectId} />
          </Section>

          <Section
            id="implementation"
            index={5}
            title="Implementation task matching"
            description="Task-level matching runs and candidate approval."
          >
            <ImplementationMatchingPanel
              projectId={projectId}
              taskCount={tasks.length}
              unassignedCount={unassigned.length}
            />
          </Section>

          <Section
            index={6}
            title="Milestones and task assignments"
            description="Every implementation task, grouped by milestone."
          >
            {milestones.length || tasks.length ? (
              <>
                <MilestoneTimeline
                  milestones={milestones}
                  tasks={tasks}
                  renderExtra={(milestone) => {
                    const milestoneTasks = tasks.filter(
                      (task) => task.milestoneId === milestone.id,
                    );
                    return milestoneTasks.length ? (
                      <TaskList tasks={milestoneTasks} allTasks={tasks} />
                    ) : null;
                  }}
                  emptyLabel=""
                />
                {unscheduledTasks.length > 0 && (
                  <div className="mt-6">
                    <h4 className="mb-3 text-sm font-semibold text-on-surface">
                      Not linked to a milestone
                    </h4>
                    <TaskList tasks={unscheduledTasks} allTasks={tasks} />
                  </div>
                )}
              </>
            ) : (
              <DeliveryEmpty
                title="No tasks yet"
                description="Materialise the approved plan to create milestones and tasks."
              />
            )}
          </Section>

          <Section
            id="reviews"
            index={7}
            title="Submissions and evaluations"
            description="Submitted implementation work and its automated review."
          >
            {submissions.length ? (
              <ul className="space-y-2">
                {submissions.map((submission) => (
                  <li key={submission.id}>
                    <Link
                      href={`/dashboard/admin/submissions/${submission.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant/30 px-4 py-3 transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-on-surface">
                          {submission.title || "Untitled submission"}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          Version {submission.version}
                          {submission.submittedAt
                            ? ` · ${formatDate(submission.submittedAt)}`
                            : ""}
                        </span>
                      </span>
                      <StatusBadge status={submission.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <DeliveryEmpty title="Nothing submitted yet" />
            )}
          </Section>

          <Section index={8} title="Revisions">
            {revisions.length ? (
              <ul className="space-y-2">
                {revisions.map((revision) => (
                  <li
                    key={revision.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant/30 px-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-on-surface">
                        {revision.title}
                      </span>
                      {revision.dueAt && (
                        <span className="text-xs text-on-surface-variant">
                          Due {formatDate(revision.dueAt)}
                        </span>
                      )}
                    </span>
                    <StatusBadge status={revision.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <DeliveryEmpty title="No revision requests" />
            )}
          </Section>

          <Section
            id="payments"
            index={9}
            title="Payment release requests"
            description="Approved task payouts are recorded immediately and dispatched through configured Stripe Connect automation."
          >
            {releases.length ? (
              <ul className="space-y-2">
                {releases.map((release) => (
                  <li
                    key={release.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant/30 px-4 py-3"
                  >
                    <span className="font-semibold text-on-surface">
                      {formatMoney(toNumber(release.amount), release.currency)}
                    </span>
                    <span className="flex items-center gap-3">
                      {["pending", "approved"].includes(release.status) ? (
                        <Link
                          href="/dashboard/admin/payment-release-requests"
                          className="text-sm text-primary-container underline-offset-2 hover:underline"
                        >
                          Decide
                        </Link>
                      ) : null}
                      <StatusBadge status={release.status} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <DeliveryEmpty title="No release requests" />
            )}
            <Link
              href="/dashboard/admin/payment-release-requests"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-container hover:underline"
            >
              Open payment release queue <ExternalLink size={14} />
            </Link>
          </Section>

          <Section
            id="handoff"
            index={10}
            title="Final integration and client handoff"
            description="Technical override surface for merge, verification, and escrow-finalization failures."
          >
            {handoff?.handoff ? (
              <div className="space-y-3 rounded-lg border border-outline-variant/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-on-surface">
                      {handoff.handoff.summary || "Integrated project delivery"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-on-surface-variant">
                      {handoff.handoff.integrationBranch} · {handoff.handoff.integrationCommitSha?.slice(0, 12) || "commit pending"}
                    </p>
                  </div>
                  <StatusBadge status={handoff.handoff.status} />
                </div>
                {handoff.handoff.lastError && (
                  <p className="rounded-lg bg-error/10 p-3 text-sm text-error">
                    {handoff.handoff.lastError}
                  </p>
                )}
                {["integration_failed", "verification_failed"].includes(handoff.handoff.status) && (
                  <Button variant="outline" loading={retryingHandoff} onClick={() => void retryFinalDelivery()}>
                    Retry integration and verification
                  </Button>
                )}
              </div>
            ) : (
              <DeliveryEmpty title="Waiting for all approved tasks" description="The final handoff record is created automatically after every implementation task is accepted." />
            )}
          </Section>
        </div>
      )}
    </DashboardShell>
  );
}
