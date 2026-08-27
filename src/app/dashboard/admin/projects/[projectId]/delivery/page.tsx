"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
  getTasks,
  type ProjectMilestone,
} from "@/services/planning";
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
  index,
  title,
  description,
  children,
}: {
  index: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
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
  staffing_blocked:
    "Automatic staffing needs attention. Open the matching section for the failed or empty run.",
  awaiting_client_acceptance:
    "The integrated delivery is ready for the client’s final decision.",
};

export default function AdminProjectDeliveryPage() {
  const { projectId } = useParams<{ projectId: string }>();
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
  const [handoff, setHandoff] = useState<ProjectHandoffOverview | null>(null);
  const [retryingHandoff, setRetryingHandoff] = useState(false);

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
          setHandoff(
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
      title={project?.title ?? "Project delivery"}
      subtitle="Repository, matching, assignments, submissions, revisions, and escrow releases."
    >
      <Link
        href="/dashboard/admin/delivery"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary-container"
      >
        <ArrowLeft size={16} /> Back to delivery
      </Link>

      {loading ? (
        <p className="text-sm text-on-surface-variant">
          Loading project delivery...
        </p>
      ) : (
        <div className="space-y-5">
          {loadErrors.length > 0 && (
            <DeliveryRetryBanner
              title="Some sections could not be loaded"
              message={`Failed to load ${loadErrors.join(", ")}.`}
              onAction={refresh}
            />
          )}

          {project && (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={project.status} />
                {project.automationStatus && (
                  <StatusBadge status={project.automationStatus} />
                )}
                <span className="text-sm text-on-surface-variant">
                  {tasks.length} tasks · {unassigned.length} unassigned ·{" "}
                  {submissions.length} submissions
                </span>
              </div>
              <p className="mt-2 text-sm text-on-surface-variant">
                {AUTOMATION_MESSAGES[project.automationStatus ?? ""] ??
                  "The page refreshes automatically as invitations, reviews, planning, and matching progress."}
              </p>
            </div>
          )}

          <Section
            index={1}
            title="Repository"
            description="One Nexus-owned private repository per project, plus collaborator invites."
          >
            <ProjectRepositoryPanel projectId={projectId} />
          </Section>

          <Section
            index={2}
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
            index={3}
            title="Task assignments"
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
            index={4}
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

          <Section index={5} title="Revisions">
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
            index={6}
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
                      <Link
                        href="/dashboard/admin/payment-release-requests"
                        className="text-sm text-primary-container underline-offset-2 hover:underline"
                      >
                        Decide
                      </Link>
                      <StatusBadge status={release.status} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <DeliveryEmpty title="No release requests" />
            )}
          </Section>

          <Section
            index={7}
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
