"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DeliveryEmpty,
  DeliveryRetryBanner,
  MilestoneTimeline,
  TaskList,
} from "@/components/delivery";
import { toNumber } from "@/components/delivery/helpers";
import { getMilestones, getTasks, type ProjectMilestone } from "@/services/planning";
import { getProject } from "@/services/projects";
import { listDeliverySubmissions } from "@/services/project-submissions";
import { listRevisionRequests } from "@/services/revisions";
import { listProjectReleaseRequests } from "@/services/release-requests";
import { formatDate, formatMoney } from "@/utils/format";
import type { Project } from "@/types/project";
import type {
  DeliveryTask,
  PaymentReleaseRequest,
  ProjectRevisionRequest,
  ProjectSubmission,
} from "@/types/delivery";

/**
 * Admin project delivery workspace.
 *
 * This file owns the shell, the shared status components, and sections 3, 5
 * and 6. Sections 1 and 2 (repository, implementation matching) and section 4's
 * evaluation panel belong to other verticals and mount into the slots below —
 * replace each PanelSlot with the real component when that service lands.
 */

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
        <h3 className="font-headline text-xl font-semibold text-on-surface">{title}</h3>
      </div>
      {description && (
        <p className="-mt-2 mb-4 text-sm text-on-surface-variant">{description}</p>
      )}
      {children}
    </section>
  );
}

function PanelSlot({ owner, service }: { owner: string; service: string }) {
  return (
    <div className="rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-low p-5 text-sm text-on-surface-variant">
      <p className="font-medium text-on-surface">Panel not mounted yet</p>
      <p className="mt-1">
        This section is owned by {owner} and mounts here once{" "}
        <code className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-xs">
          {service}
        </code>{" "}
        exists.
      </p>
    </div>
  );
}

export default function AdminProjectDeliveryPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [revisions, setRevisions] = useState<ProjectRevisionRequest[]>([]);
  const [releases, setReleases] = useState<PaymentReleaseRequest[]>([]);

  useEffect(() => {
    if (!projectId) return;

    Promise.allSettled([
      getProject(projectId),
      getMilestones(projectId),
      getTasks(projectId, { limit: 200 }),
      listDeliverySubmissions(projectId),
      listRevisionRequests(projectId),
      listProjectReleaseRequests(projectId),
    ])
      .then(
        ([
          projectResult,
          milestonesResult,
          tasksResult,
          submissionsResult,
          revisionsResult,
          releasesResult,
        ]) => {
          setProject(projectResult.status === "fulfilled" ? projectResult.value : null);
          setMilestones(
            milestonesResult.status === "fulfilled" ? milestonesResult.value : [],
          );
          setTasks(
            tasksResult.status === "fulfilled" ? (tasksResult.value as DeliveryTask[]) : [],
          );
          setSubmissions(
            submissionsResult.status === "fulfilled" ? submissionsResult.value.items : [],
          );
          setRevisions(
            revisionsResult.status === "fulfilled" ? revisionsResult.value.items : [],
          );
          setReleases(
            releasesResult.status === "fulfilled" ? releasesResult.value.items : [],
          );

          const failures: string[] = [];
          if (milestonesResult.status === "rejected") failures.push("milestones");
          if (tasksResult.status === "rejected") failures.push("tasks");
          if (submissionsResult.status === "rejected") failures.push("submissions");
          if (revisionsResult.status === "rejected") failures.push("revision requests");
          if (releasesResult.status === "rejected") failures.push("payment releases");
          setLoadErrors(failures);
        },
      )
      .finally(() => setLoading(false));
  }, [projectId, reloadKey]);

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
        <p className="text-sm text-on-surface-variant">Loading project delivery...</p>
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
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={project.status} />
              <span className="text-sm text-on-surface-variant">
                {tasks.length} tasks · {unassigned.length} unassigned ·{" "}
                {submissions.length} submissions
              </span>
            </div>
          )}

          <Section
            index={1}
            title="Repository"
            description="One Nexus-owned private repository per project, plus collaborator invites."
          >
            <PanelSlot owner="Sameh" service="src/services/repositories.ts" />
          </Section>

          <Section
            index={2}
            title="Implementation task matching"
            description="Task-level matching runs and candidate approval."
          >
            <PanelSlot owner="Sameh" service="src/services/implementation-matching.ts" />
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
                  <li
                    key={submission.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant/30 px-4 py-3"
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
                  </li>
                ))}
              </ul>
            ) : (
              <DeliveryEmpty title="Nothing submitted yet" />
            )}
            <div className="mt-4">
              <PanelSlot owner="Ebrahim" service="src/services/evaluations.ts" />
            </div>
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
            description="Sprint 5 releases are ledger-only; no Stripe transfer is attempted."
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
        </div>
      )}
    </DashboardShell>
  );
}
