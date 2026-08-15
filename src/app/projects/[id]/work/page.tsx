"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle, MessageSquareWarning } from "lucide-react";
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
import { getMilestones, getTasks, type ProjectMilestone } from "@/services/planning";
import { getProject } from "@/services/projects";
import {
  getDeliverySubmission,
  listDeliverySubmissions,
  reviewDeliverySubmission,
  type SubmissionDetail,
} from "@/services/project-submissions";
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

function EvaluationSummary({ detail }: { detail: SubmissionDetail }) {
  const run = detail.latestEvaluationRun ?? detail.evaluationRun ?? null;
  if (!run) return null;

  const score = toNumber(run.score);
  const rubric = run.acceptanceCoverage?.items ?? run.findings?.rubric ?? [];
  const revisionNotes = run.findings?.revisionNotes?.trim();

  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-on-surface">Automated review</span>
        <StatusBadge status={run.status} />
        {score !== null && (
          <span className="text-sm font-semibold text-on-surface">
            {score}
            <span className="text-on-surface-variant">/100</span>
          </span>
        )}
      </div>

      {run.summary && (
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{run.summary}</p>
      )}

      {run.acceptanceCoverage && (
        <p className="mt-2 text-xs text-on-surface-variant">
          Acceptance criteria: {run.acceptanceCoverage.met}/{run.acceptanceCoverage.total} met
        </p>
      )}

      {rubric.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {rubric.map((item) => (
            <li
              key={item.criterion}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0 text-on-surface-variant">{item.criterion}</span>
              <StatusBadge status={item.met ? "met" : "unmet"} />
            </li>
          ))}
        </ul>
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

  const [openSubmission, setOpenSubmission] = useState<SubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [deciding, setDeciding] = useState<"approve" | "revise" | null>(null);

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
    setOpenSubmission(null);
    setFeedback("");
    setReloadKey((key) => key + 1);
  }, []);

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
      map.set(release.milestoneId, [...(map.get(release.milestoneId) ?? []), release]);
    }
    return map;
  }, [releases]);

  const openDetail = (submissionId: string) => {
    setDetailLoading(true);
    setFeedback("");
    getDeliverySubmission(submissionId)
      .then((detail) => setOpenSubmission(detail))
      .catch((error) =>
        toast.error(
          "Could not load submission",
          error instanceof Error ? error.message : "Please try again.",
        ),
      )
      .finally(() => setDetailLoading(false));
  };

  const decide = async (decision: "approved" | "changes_requested") => {
    if (!openSubmission) return;
    if (decision === "changes_requested" && !feedback.trim()) {
      toast.error("Feedback required", "Tell the freelancer what needs to change.");
      return;
    }

    setDeciding(decision === "approved" ? "approve" : "revise");
    try {
      await reviewDeliverySubmission(openSubmission.id, {
        decision,
        feedback: feedback.trim() || undefined,
        createRevisionRequest: decision === "changes_requested",
      });
      toast.success(
        decision === "approved" ? "Submission approved" : "Revision requested",
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

  const canDecide =
    openSubmission?.status === "submitted" || openSubmission?.status === "under_review";

  return (
    <DashboardShell
      role="customer"
      title="Delivery"
      subtitle="Track implementation progress, review submitted work, and follow payments."
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
                  const milestoneReleases = releasesByMilestone.get(milestone.id) ?? [];
                  const milestoneTasks = tasks.filter(
                    (task) => task.milestoneId === milestone.id,
                  );

                  return (
                    <div className="space-y-3">
                      {milestoneReleases.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-on-surface-variant">Escrow</span>
                          {milestoneReleases.map((release) => (
                            <span key={release.id} className="flex items-center gap-2">
                              <span className="font-semibold text-on-surface">
                                {formatMoney(toNumber(release.amount), release.currency)}
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
                            const submission = latestSubmissionByTask.get(task.id);
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
                </div>

                {canDecide ? (
                  <div className="mt-5 space-y-3">
                    <label
                      htmlFor="review-feedback"
                      className="block text-sm font-medium text-on-surface"
                    >
                      Feedback
                    </label>
                    <textarea
                      id="review-feedback"
                      rows={3}
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                      placeholder="Required when requesting changes."
                      className="input-halo w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-all placeholder:text-outline/50"
                    />
                    <div className="flex flex-wrap gap-3">
                      <Button
                        size="sm"
                        onClick={() => decide("approved")}
                        loading={deciding === "approve"}
                        disabled={deciding !== null}
                      >
                        <CheckCircle size={15} />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide("changes_requested")}
                        loading={deciding === "revise"}
                        disabled={deciding !== null}
                      >
                        <MessageSquareWarning size={15} />
                        Request changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-on-surface-variant">
                    This version is {openSubmission.status.replace(/_/g, " ")} and cannot be
                    reviewed again.
                  </p>
                )}
              </section>
            )}

            {detailLoading && (
              <p className="text-sm text-on-surface-variant">Loading submission...</p>
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
                <p className="mt-3 text-sm text-on-surface-variant">No open revisions.</p>
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
                        {formatMoney(toNumber(release.amount), release.currency)}
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
