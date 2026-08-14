import { api, deliveryEndpoints, getApiErrorMessage } from "@/lib/api";

export interface ProjectRepository {
  id: string;
  projectId: string;
  provider: string;
  owner: string;
  repoName: string;
  repoUrl: string;
  defaultBranch: string;
  status: "pending" | "active" | "failed" | "archived";
  error?: string | null;
  lastSyncedAt?: string | null;
  createdAt: string;
}

export interface AdminProjectRepository extends ProjectRepository {
  projectTitle: string | null;
  collaboratorCount: number;
  missingUsernameCount: number;
}

export interface RepositoryCollaborator {
  id: string;
  repositoryId: string;
  projectId: string;
  freelancerProfileId: string | null;
  freelancerName: string | null;
  githubUsername: string | null;
  permission: string;
  inviteStatus:
    | "pending"
    | "missing_username"
    | "invited"
    | "accepted"
    | "declined"
    | "removed"
    | "failed";
  inviteUrl: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  error?: string | null;
}

export interface ProjectRepositoryDetail {
  repository: ProjectRepository;
  collaborators: RepositoryCollaborator[];
}

export interface SyncCollaboratorsResult {
  repositoryId: string;
  invited: number;
  missingUsername: number;
  collaborators: RepositoryCollaborator[];
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

export async function createProjectRepository(
  projectId: string,
  payload: {
    provider?: "github";
    owner?: string;
    repoName?: string;
    visibility?: "private" | "public";
    defaultBranch?: string;
    description?: string;
  } = {}
): Promise<ProjectRepository> {
  try {
    const { data } = await api.post<ApiDataResponse<ProjectRepository>>(
      deliveryEndpoints.repositories.create(projectId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not create the project repository"));
  }
}

export async function getProjectRepository(
  projectId: string
): Promise<ProjectRepositoryDetail> {
  try {
    const { data } = await api.get<ApiDataResponse<ProjectRepositoryDetail>>(
      deliveryEndpoints.repositories.projectRepository(projectId)
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load the project repository"));
  }
}

export async function syncRepositoryCollaborators(
  projectId: string,
  payload: {
    includeTaskAssignees?: boolean;
    includePlanningAssignees?: boolean;
    freelancerProfileIds?: string[];
    permission?: string;
  } = {}
): Promise<SyncCollaboratorsResult> {
  try {
    const { data } = await api.post<ApiDataResponse<SyncCollaboratorsResult>>(
      deliveryEndpoints.repositories.syncCollaborators(projectId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not sync repository collaborators"));
  }
}

export async function resendCollaboratorInvite(
  collaboratorId: string,
  payload: { permission?: string } = {}
): Promise<RepositoryCollaborator> {
  try {
    const { data } = await api.post<ApiDataResponse<RepositoryCollaborator>>(
      deliveryEndpoints.repositories.resendInvite(collaboratorId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not resend the invite"));
  }
}

export async function getAdminRepositories(params?: {
  status?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AdminProjectRepository>> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.projectId) query.append("projectId", params.projectId);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const { data } = await api.get<PaginatedResponse<AdminProjectRepository>>(
      `${deliveryEndpoints.repositories.adminList}?${query.toString()}`
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load repositories"));
  }
}
