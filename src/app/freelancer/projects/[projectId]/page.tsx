"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  ClipboardCheck,
  FileText,
  ListChecks,
  XCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  getFreelancerProjectAssignment,
  updateRoleAssignmentStatus,
  type FreelancerProjectAssignmentDetail,
  type RoleAssignment,
  type RoleBrief,
} from "@/services/matching";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DeliveryEmpty,
  DeliveryRetryBanner,
  TaskList,
} from "@/components/delivery";
import { toNumber } from "@/components/delivery/helpers";
import { getTasks } from "@/services/planning";
import { getMyFreelancerProfile } from "@/services/freelancers";
import {
  getDeliverySubmission,
  listDeliverySubmissions,
} from "@/services/project-submissions";
import { listRevisionRequests } from "@/services/revisions";
import { listProjectReleaseRequests } from "@/services/release-requests";
import { formatDate, formatMoney } from "@/utils/format";
import type {
  DeliveryTask,
  PaymentReleaseRequest,
  ProjectRevisionRequest,
  ProjectSubmission,
} from "@/types/delivery";

function roleLabel(role?: string | null) {
  if (!role) return "Planning role";
  if (role === "ui_ux" || role === "uiux") return "UI/UX";
  if (role === "architect" || role === "architecture") return "Architecture";
  return role.replace(/_/g, " ");
}

function safeList(value?: string[] | null) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function confirmedContextValue(value?: string | null) {
  if (!value?.trim()) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\//g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[?.!,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (
    [
      "idk",
      "i dont know",
      "dont know",
      "not sure",
      "no idea",
      "unknown",
      "na",
      "not applicable",
      "not specified",
      "tbd",
      "like what",
      "what do you mean",
    ].includes(normalized) ||
    /^(like what|what do you mean)(\s+[a-z0-9]+){0,2}$/.test(normalized)
  ) {
    return null;
  }
  return value.trim();
}

function BriefList({
  title,
  items,
}: {
  title: string;
  items?: string[] | null;
}) {
  const list = safeList(items);
  if (!list.length) return null;

  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
      <h3 className="font-headline text-base font-semibold text-on-surface">
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
        {list.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-container" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

export default function FreelancerProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();
  const [detail, setDetail] =
    useState<FreelancerProjectAssignmentDetail | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sprint 5 delivery state
  const [profileId, setProfileId] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<DeliveryTask[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [revisions, setRevisions] = useState<ProjectRevisionRequest[]>([]);
  const [releases, setReleases] = useState<PaymentReleaseRequest[]>([]);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    let currentProfileId: string | null = null;

    getMyFreelancerProfile()
      .catch(() => null)
      .then((profile) => {
        currentProfileId = profile?.id ?? null;
        setProfileId(currentProfileId);

        return Promise.allSettled([
          getFreelancerProjectAssignment(projectId),
          getTasks(projectId, { limit: 200 }),
          listDeliverySubmissions(
            projectId,
            currentProfileId
              ? { freelancerProfileId: currentProfileId }
              : undefined,
          ),
          listRevisionRequests(
            projectId,
            currentProfileId
              ? { assignedToFreelancerProfileId: currentProfileId }
              : undefined,
          ),
          listProjectReleaseRequests(
            projectId,
            currentProfileId
              ? { freelancerProfileId: currentProfileId }
              : undefined,
          ),
        ]);
      })
      .then(
        ([
          assignmentResult,
          tasksResult,
          submissionsResult,
          revisionsResult,
          releasesResult,
        ]) => {
          // The detail endpoint returns the project for either a planning role
          // or an implementation-task assignment.
          if (assignmentResult.status === "fulfilled") {
            setDetail(assignmentResult.value);
            setSelectedAssignmentId(
              assignmentResult.value.assignments[0]?.id ?? null,
            );
          } else {
            setDetail(null);
          }

          setAllTasks(settled(tasksResult, []) as DeliveryTask[]);
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

          const failures: string[] = [];
          if (!currentProfileId) failures.push("your freelancer profile");
          if (tasksResult.status === "rejected") failures.push("tasks");
          if (submissionsResult.status === "rejected")
            failures.push("submissions");
          if (revisionsResult.status === "rejected") {
            failures.push("revision requests");
          }
          if (releasesResult.status === "rejected") {
            failures.push("payment releases");
          }
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

  const myTasks = useMemo(
    () =>
      profileId
        ? allTasks.filter(
            (task) => task.assignedFreelancerProfileId === profileId,
          )
        : [],
    [allTasks, profileId],
  );

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
  useEffect(() => {
    const pending = submissions.filter((submission) =>
      ["submitted", "under_review"].includes(submission.status),
    );
    if (!pending.length) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refreshPendingSubmissions = async () => {
      const details = await Promise.allSettled(
        pending.map((submission) => getDeliverySubmission(submission.id)),
      );
      if (cancelled) return;
      const fulfilled = details
        .filter(
          (
            result,
          ): result is PromiseFulfilledResult<
            Awaited<ReturnType<typeof getDeliverySubmission>>
          > => result.status === "fulfilled",
        )
        .map((result) => result.value);
      if (fulfilled.length) {
        const byId = new Map(fulfilled.map((detail) => [detail.id, detail]));
        setSubmissions((current) => {
          let changed = false;
          const next = current.map((submission) => {
            const detail = byId.get(submission.id);
            if (
              !detail ||
              (detail.status === submission.status &&
                detail.updatedAt === submission.updatedAt)
            ) {
              return submission;
            }
            changed = true;
            return detail;
          });
          return changed ? next : current;
        });
        setAllTasks((current) =>
          current.map(
            (task) =>
              fulfilled.find((detail) => detail.task?.id === task.id)?.task ??
              task,
          ),
        );
      }
      if (
        fulfilled.some((detail) =>
          ["submitted", "under_review"].includes(detail.status),
        )
      ) {
        timer = setTimeout(() => void refreshPendingSubmissions(), 5_000);
      }
    };

    void refreshPendingSubmissions();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [submissions]);

  const assignments = detail?.assignments ?? [];
  const assignment =
    assignments.find((item) => item.id === selectedAssignmentId) ??
    assignments[0] ??
    null;
  const roleBrief: RoleBrief | null = assignment?.roleBrief ?? null;

  const handleStatusChange = async (
    target: RoleAssignment,
    newStatus: "accepted" | "declined" | "in_progress",
  ) => {
    setActionLoading(newStatus);
    try {
      const updated = await updateRoleAssignmentStatus(target.id, {
        status: newStatus,
      });
      toast.success("Status updated", `Assignment moved to ${newStatus}`);
      setDetail((current) =>
        current
          ? {
              ...current,
              assignments: current.assignments.map((item) =>
                item.id === target.id ? { ...item, ...updated } : item,
              ),
            }
          : current,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update assignment";
      toast.error("Status update failed", message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardShell
      role="freelancer"
      title="Assignment Details"
      subtitle="Review your role-specific brief and submit planning deliverables."
    >
      <Link
        href="/freelancer/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary-container"
      >
        <ArrowLeft size={16} /> Back to my projects
      </Link>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading assignment...</p>
      ) : !assignment && !myTasks.length ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center card-shadow">
          <p className="font-semibold text-on-surface">
            Nothing assigned to you here.
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            This project has no planning role or implementation task assigned to
            your freelancer profile.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-5">
            {loadErrors.length > 0 && (
              <DeliveryRetryBanner
                title="Some sections could not be loaded"
                message={`Failed to load ${loadErrors.join(", ")}. Everything else on this page is up to date.`}
                onAction={refresh}
              />
            )}

            {!assignment && (
              <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                  Implementation work
                </p>
                <h2 className="mt-1 font-headline text-2xl font-semibold text-on-surface">
                  {detail?.project.title ?? "Project delivery"}
                </h2>
                {detail?.project.description && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                    {detail.project.description}
                  </p>
                )}
              </section>
            )}

            {assignment && detail && (
              <>
                <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                        {roleLabel(assignment.roleKey)} planning assignment
                      </p>
                      <h2 className="mt-1 font-headline text-2xl font-semibold text-on-surface">
                        {detail.project.title}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                        {detail.project.description ||
                          detail.brief.summary ||
                          "Project details are being prepared."}
                      </p>
                    </div>
                    <StatusBadge status={assignment.status} />
                  </div>

                  {assignments.length > 1 ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {assignments.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedAssignmentId(item.id)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            item.id === assignment.id
                              ? "bg-primary-container text-on-primary"
                              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                          }`}
                        >
                          {roleLabel(item.roleKey)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-primary-container/10 p-2 text-primary-container">
                      <ClipboardCheck size={20} />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-headline text-xl font-semibold text-on-surface">
                          {roleBrief?.title ||
                            `${roleLabel(assignment.roleKey)} brief`}
                        </h3>
                        {assignment.roleBriefStatus ? (
                          <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                            {assignment.roleBriefStatus}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                        {roleBrief?.summary ||
                          detail.brief.summary ||
                          "Use the project brief and your role expectations to prepare the planning deliverable."}
                      </p>
                    </div>
                  </div>
                </section>

                <div className="grid gap-4 lg:grid-cols-2">
                  <BriefList title="Objectives" items={roleBrief?.objectives} />
                  <BriefList
                    title="Responsibilities"
                    items={roleBrief?.responsibilities}
                  />
                  <BriefList
                    title="Expected deliverables"
                    items={roleBrief?.expectedDeliverables}
                  />
                  <BriefList
                    title="Acceptance criteria"
                    items={roleBrief?.acceptanceCriteria}
                  />
                  <BriefList
                    title="Required inputs"
                    items={roleBrief?.requiredInputs}
                  />
                  <BriefList
                    title="Handoff checklist"
                    items={roleBrief?.handoffChecklist}
                  />
                </div>

                {safeList(roleBrief?.suggestedQuestions).length ? (
                  <BriefList
                    title="Questions to clarify"
                    items={roleBrief?.suggestedQuestions}
                  />
                ) : null}
              </>
            )}

            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-headline text-xl font-semibold text-on-surface">
                  Implementation tasks
                </h3>
                <span className="text-sm text-on-surface-variant">
                  {myTasks.length} assigned to you
                </span>
              </div>

              {myTasks.length ? (
                <TaskList
                  className="mt-4"
                  tasks={myTasks}
                  allTasks={allTasks}
                  hrefForTask={(task) =>
                    `/freelancer/projects/${projectId}/tasks/${task.id}`
                  }
                />
              ) : (
                <DeliveryEmpty
                  className="mt-4"
                  title="No implementation tasks yet"
                  description="Once the admin assigns you a task from the approved plan, it will appear here."
                />
              )}
            </section>

            {latestSubmissionByTask.size > 0 && (
              <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
                <h3 className="font-headline text-xl font-semibold text-on-surface">
                  Your latest submissions
                </h3>
                <ul className="mt-4 space-y-2">
                  {[...latestSubmissionByTask.values()].map((submission) => (
                    <li key={submission.id}>
                      <Link
                        href={`/freelancer/projects/${projectId}/tasks/${submission.taskId}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant/30 px-4 py-3 transition-colors hover:bg-surface-container-low"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-on-surface">
                            {submission.title || "Untitled submission"}
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            Version {submission.version}
                            {submission.submittedAt
                              ? ` · submitted ${formatDate(submission.submittedAt)}`
                              : ""}
                          </span>
                        </span>
                        <StatusBadge status={submission.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </main>

          <aside className="space-y-4">
            {assignment && detail && (
              <>
                <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
                  <h3 className="font-headline text-base font-semibold text-on-surface">
                    Your Assignment
                  </h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">Role</span>
                      <span className="font-semibold text-on-surface">
                        {roleLabel(assignment.roleKey)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">Phase</span>
                      <span className="font-semibold capitalize text-on-surface">
                        {assignment.phase}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">
                        Planning pay
                      </span>
                      <span className="font-semibold text-on-surface">
                        {assignment.allocatedAmount != null &&
                        (assignment.currency || detail.project.currency)
                          ? formatMoney(
                              toNumber(assignment.allocatedAmount),
                              assignment.currency || detail.project.currency,
                            )
                          : "Not allocated"}
                      </span>
                    </div>
                    {assignment.estimatedHours != null && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-on-surface-variant">
                          Estimated effort
                        </span>
                        <span className="font-semibold text-on-surface">
                          {assignment.estimatedHours} hours
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">Deadline</span>
                      <span className="font-semibold text-on-surface">
                        {detail.project.deadline
                          ? new Date(
                              detail.project.deadline,
                            ).toLocaleDateString()
                          : detail.project.isDeadlineFlexible
                            ? "Flexible"
                            : "Not set"}
                      </span>
                    </div>
                  </div>

                  {assignment.status === "assigned" ? (
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <Button
                        onClick={() =>
                          handleStatusChange(assignment, "accepted")
                        }
                        loading={actionLoading === "accepted"}
                        className="!w-full px-3 py-2 text-sm"
                      >
                        <CheckCircle size={15} />
                        Accept
                      </Button>
                      <Button
                        onClick={() =>
                          handleStatusChange(assignment, "declined")
                        }
                        loading={actionLoading === "declined"}
                        variant="outline"
                        className="!w-full px-3 py-2 text-sm text-error hover:bg-error/10"
                      >
                        <XCircle size={15} />
                        Decline
                      </Button>
                    </div>
                  ) : null}

                  {assignment.status === "accepted" ? (
                    <Button
                      onClick={() =>
                        handleStatusChange(assignment, "in_progress")
                      }
                      loading={actionLoading === "in_progress"}
                      className="mt-5 !w-full px-3 py-2 text-sm"
                    >
                      <ListChecks size={15} />
                      Start work
                    </Button>
                  ) : null}

                  {["in_progress", "completed"].includes(assignment.status) ? (
                    <Link href={`/freelancer/projects/${projectId}/planning`}>
                      <Button
                        variant="outline"
                        className="mt-5 !w-full px-3 py-2 text-sm"
                      >
                        <FileText size={15} />
                        Planning deliverables
                      </Button>
                    </Link>
                  ) : null}
                </section>

                <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
                  <h3 className="font-headline text-base font-semibold text-on-surface">
                    Confirmed project context
                  </h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    {[
                      ["Domain", detail.brief.businessDomain],
                      ["Goal", detail.brief.mainGoal],
                      ["Users", detail.brief.targetUsers],
                      ["Platforms", detail.brief.platforms],
                      ["Features", detail.brief.coreFeatures],
                      ["Preferences", detail.brief.constraintsPreferences],
                    ].map(([label, rawValue]) => {
                      const value = confirmedContextValue(rawValue);
                      return value ? (
                        <div key={label}>
                          <dt className="font-semibold text-on-surface">
                            {label}
                          </dt>
                          <dd className="mt-1 leading-6 text-on-surface-variant">
                            {value}
                          </dd>
                        </div>
                      ) : null;
                    })}
                  </dl>
                </section>
              </>
            )}

            {detail?.implementationCompensation.allocatedAmount != null && (
              <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
                <h3 className="font-headline text-base font-semibold text-on-surface">
                  Your task allocation
                </h3>
                <p className="mt-3 text-2xl font-semibold text-on-surface">
                  {formatMoney(
                    detail.implementationCompensation.allocatedAmount,
                    detail.implementationCompensation.currency,
                  )}
                </p>
                <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                  This is the sum of your assigned task shares, not the whole
                  project budget. Approved task amounts appear in your earnings.
                </p>
              </section>
            )}

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
                  No revisions requested.
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
