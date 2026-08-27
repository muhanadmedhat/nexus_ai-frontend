import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";
import { getTasks } from "@/services/planning";
import { listDeliverySubmissions } from "@/services/project-submissions";
import { listRevisionRequests } from "@/services/revisions";
import { listProjectReleaseRequests } from "@/services/release-requests";
import type { DeliveryTask } from "@/types/delivery";

/**
 * Aggregates for the admin delivery control room.
 *
 * There is no backend endpoint that returns per-project delivery counts, so
 * this fans out per project. Tracked as R11 in sprint-5-issues.md — a single
 * aggregate endpoint would replace the whole fan-out.
 */

/** Project statuses the delivery control room covers. */
export const DELIVERY_STATUSES = [
  "implementation_ready",
  "ready_for_implementation_funding",
  "matching",
  "matched",
  "assigned",
  "active",
  "under_review",
] as const;

export interface DeliveryProject {
  id: string;
  title: string | null;
  status: string;
  currency: string | null;
  customer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

export interface DeliveryProjectSummary {
  project: DeliveryProject;
  milestoneCount: number;
  taskCount: number;
  unassignedTasks: number;
  tasksInReview: number;
  pendingSubmissions: number;
  openRevisions: number;
  pendingReleases: number;
  heldEscrow: number;
  currency: string;
  nextAction: string;
}

interface ApiPaginatedResponse<T> {
  status: string;
  data: T[];
  total?: number;
}

export async function listDeliveryProjects(limit = 50): Promise<DeliveryProject[]> {
  try {
    const { data } = await api.get<ApiPaginatedResponse<DeliveryProject>>(
      `${API_ENDPOINTS.admin.projects}?page=1&limit=${limit}`,
    );
    const items = Array.isArray(data.data) ? data.data : [];
    return items.filter((project) =>
      (DELIVERY_STATUSES as readonly string[]).includes(project.status),
    );
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load delivery projects"));
  }
}

function decideNextAction(summary: Omit<DeliveryProjectSummary, "nextAction">): string {
  if (summary.unassignedTasks > 0) return `Assign ${summary.unassignedTasks} task(s)`;
  if (summary.pendingSubmissions > 0) {
    return `Review ${summary.pendingSubmissions} submission(s)`;
  }
  if (summary.openRevisions > 0) return `${summary.openRevisions} revision(s) open`;
  if (summary.pendingReleases > 0) return `Approve ${summary.pendingReleases} release(s)`;
  if (summary.taskCount === 0) return "Materialise the plan";
  return "On track";
}

export async function getDeliveryProjectSummary(
  project: DeliveryProject,
): Promise<DeliveryProjectSummary> {
  const [tasksResult, submissionsResult, revisionsResult, releasesResult] =
    await Promise.allSettled([
      getTasks(project.id),
      listDeliverySubmissions(project.id),
      listRevisionRequests(project.id),
      listProjectReleaseRequests(project.id),
    ]);

  const tasks =
    tasksResult.status === "fulfilled" ? (tasksResult.value as DeliveryTask[]) : [];
  const submissions =
    submissionsResult.status === "fulfilled" ? submissionsResult.value.items : [];
  const revisions =
    revisionsResult.status === "fulfilled" ? revisionsResult.value.items : [];
  const releases =
    releasesResult.status === "fulfilled" ? releasesResult.value.items : [];

  const milestoneIds = new Set(
    tasks.map((task) => task.milestoneId).filter((id): id is string => Boolean(id)),
  );

  const pendingReleases = releases.filter((release) => release.status === "pending");
  const heldEscrow = pendingReleases.reduce(
    (total, release) => total + (Number(release.amount) || 0),
    0,
  );

  const base = {
    project,
    milestoneCount: milestoneIds.size,
    taskCount: tasks.length,
    unassignedTasks: tasks.filter((task) => !task.assignedFreelancerProfileId).length,
    tasksInReview: tasks.filter((task) => task.status === "review").length,
    pendingSubmissions: submissions.filter(
      (submission) =>
        submission.status === "submitted" || submission.status === "under_review",
    ).length,
    openRevisions: revisions.filter(
      (revision) => revision.status === "open" || revision.status === "in_progress",
    ).length,
    pendingReleases: pendingReleases.length,
    heldEscrow,
    currency: releases[0]?.currency ?? project.currency ?? "EGP",
  };

  return { ...base, nextAction: decideNextAction(base) };
}
