import { api, sprint4Endpoints, deliveryEndpoints, getApiErrorMessage } from "@/lib/api";
import type { MatchingRun } from "@/services/matching";

export interface TaskMatchingRun extends MatchingRun {
  targetTaskId: string | null;
  taskTitle: string | null;
}

export interface StartTaskMatchingResult {
  projectId: string;
  projectStatus: string;
  runs: {
    id: string;
    targetType: "task";
    targetTaskId: string;
    targetRoleKey: string | null;
    taskTitle: string | null;
    status: string;
    candidateCount: number;
    summary?: string;
    error?: string;
  }[];
}

export interface TaskAssignment {
  id: string;
  projectId: string;
  milestoneId: string | null;
  status: string;
  assignedFreelancerProfileId: string;
  sourceMatchingRunId: string | null;
  sourceCandidateId: string | null;
  assignedBy: string | null;
  assignedAt: string;
}

export interface ImplementationMatchingFilters {
  maxHourlyRate?: number;
  minAvailabilityHours?: number;
  skills?: string[];
  includeFreelancerIds?: string[];
  excludeFreelancerIds?: string[];
  limit?: number;
}

interface ApiDataResponse<T> {
  status: string;
  data: T;
}

interface PaginatedResponse<T> {
  status: string;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Leaving out taskIds and milestoneId matches every unassigned task.
export async function startImplementationMatching(
  projectId: string,
  payload: {
    taskIds?: string[];
    milestoneId?: string;
    mode?: "sync" | "async";
    filters?: ImplementationMatchingFilters;
  } = {}
): Promise<StartTaskMatchingResult> {
  try {
    const { data } = await api.post<ApiDataResponse<StartTaskMatchingResult>>(
      deliveryEndpoints.implementationMatching.startTasks(projectId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not start implementation matching"));
  }
}

export async function getTaskMatchingRuns(
  projectId: string,
  params?: { status?: string; targetTaskId?: string; page?: number; limit?: number }
): Promise<PaginatedResponse<TaskMatchingRun>> {
  try {
    const query = new URLSearchParams({ targetType: "task" });
    if (params?.status) query.append("status", params.status);
    if (params?.targetTaskId) query.append("targetTaskId", params.targetTaskId);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const { data } = await api.get<PaginatedResponse<TaskMatchingRun>>(
      `${sprint4Endpoints.matching.projectRuns(projectId)}?${query.toString()}`
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load task matching runs"));
  }
}

export interface AdminTaskMatchingRun extends TaskMatchingRun {
  projectTitle: string | null;
}

// Cross-project queue of implementation-task runs for the admin screens.
export async function getAdminTaskMatchingRuns(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AdminTaskMatchingRun>> {
  try {
    const query = new URLSearchParams({ targetType: "task" });
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const { data } = await api.get<PaginatedResponse<AdminTaskMatchingRun>>(
      `${sprint4Endpoints.adminSprint4.matchingRuns}?${query.toString()}`
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load implementation matching runs"));
  }
}

export async function assignTask(
  taskId: string,
  payload: {
    candidateId?: string;
    freelancerProfileId?: string;
    sourceMatchingRunId?: string;
    notes?: string;
  }
): Promise<TaskAssignment> {
  try {
    const { data } = await api.post<ApiDataResponse<TaskAssignment>>(
      deliveryEndpoints.implementationMatching.assignTask(taskId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not assign the task"));
  }
}
