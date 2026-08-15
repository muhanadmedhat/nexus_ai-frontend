import { api, deliveryEndpoints, getApiErrorMessage } from "@/lib/api";
import {
  fixtureRevisionRequests,
  paginateFixture,
  deliveryFixturesEnabled,
} from "@/lib/fixtures/delivery";
import type { PaginatedResult } from "./project-submissions";
import type {
  ProjectRevisionRequest,
  RequestedChanges,
  RevisionPriority,
  RevisionStatus,
} from "@/types/delivery";

interface ApiDataResponse<T> {
  status: string;
  data: T;
}

interface ApiPaginatedResponse<T> {
  status: string;
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface RevisionListParams {
  status?: RevisionStatus | string;
  taskId?: string;
  milestoneId?: string;
  assignedToFreelancerProfileId?: string;
  page?: number;
  limit?: number;
}

export interface CreateRevisionRequestPayload {
  milestoneId?: string;
  taskId?: string;
  submissionId?: string;
  assignedToFreelancerProfileId?: string;
  priority?: RevisionPriority;
  title: string;
  description?: string;
  requestedChanges?: RequestedChanges;
  dueAt?: string;
}

export interface UpdateRevisionStatusPayload {
  status: RevisionStatus;
  notes?: string;
}

export async function createRevisionRequest(
  projectId: string,
  payload: CreateRevisionRequestPayload,
): Promise<ProjectRevisionRequest> {
  if (deliveryFixturesEnabled()) {
    return { ...fixtureRevisionRequests[0], ...payload, status: "open" } as ProjectRevisionRequest;
  }

  try {
    const { data } = await api.post<ApiDataResponse<ProjectRevisionRequest>>(
      deliveryEndpoints.revisions.create(projectId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not create revision request"));
  }
}

export async function listRevisionRequests(
  projectId: string,
  params?: RevisionListParams,
): Promise<PaginatedResult<ProjectRevisionRequest>> {
  if (deliveryFixturesEnabled()) {
    const matching = fixtureRevisionRequests.filter(
      (revision) =>
        (!params?.status || revision.status === params.status) &&
        (!params?.taskId || revision.taskId === params.taskId),
    );
    return paginateFixture(matching, params?.page, params?.limit);
  }

  try {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.taskId) query.append("taskId", params.taskId);
    if (params?.milestoneId) query.append("milestoneId", params.milestoneId);
    if (params?.assignedToFreelancerProfileId) {
      query.append("assignedToFreelancerProfileId", params.assignedToFreelancerProfileId);
    }
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const queryString = query.toString();
    const { data } = await api.get<ApiPaginatedResponse<ProjectRevisionRequest>>(
      `${deliveryEndpoints.revisions.projectList(projectId)}${queryString ? `?${queryString}` : ""}`,
    );

    const items = Array.isArray(data.data) ? data.data : [];
    return {
      items,
      total: data.total ?? items.length,
      page: data.page ?? params?.page ?? 1,
      limit: data.limit ?? params?.limit ?? items.length,
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load revision requests"));
  }
}

export async function updateRevisionRequestStatus(
  revisionRequestId: string,
  payload: UpdateRevisionStatusPayload,
): Promise<ProjectRevisionRequest> {
  if (deliveryFixturesEnabled()) {
    return { ...fixtureRevisionRequests[0], status: payload.status };
  }

  try {
    const { data } = await api.patch<ApiDataResponse<ProjectRevisionRequest>>(
      deliveryEndpoints.revisions.updateStatus(revisionRequestId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not update revision request"));
  }
}
