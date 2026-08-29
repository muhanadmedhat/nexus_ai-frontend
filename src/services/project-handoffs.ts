import { api, getApiErrorMessage } from '@/lib/api';

type ApiData<T> = { status: string; data: T };

export interface ProjectRating {
  id: string;
  rating: number;
  categoryRatings: Record<string, number> | null;
  comment: string | null;
  createdAt: string;
}

export interface ProjectContributor {
  userId: string;
  freelancerProfileId: string;
  name: string;
  roleKeys: string[];
  rating: ProjectRating | null;
}

export interface DeliveryContractItem {
  title: string;
  status: string;
  evidence: string | null;
  responsibleTasks?: Array<{
    taskId: string;
    taskTitle: string;
    roleKey: string | null;
  }>;
}

export interface DeliveryContract {
  deliverables: DeliveryContractItem[];
  acceptanceCriteria: DeliveryContractItem[];
  integrationChecks: DeliveryContractItem[];
  repositoryUrl: string | null;
  branch: string;
  evaluatedCommitSha: string;
  evidenceRequirements?: {
    liveUrl: boolean;
    artifactUrls: boolean;
    sourceArchive: boolean;
  };
  responsibilityVersion?: number;
  verifiedAt: string;
}

export interface ProjectHandoff {
  id: string;
  projectId: string;
  status: string;
  integrationBranch: string;
  repositoryUrl: string | null;
  integrationCommitSha: string | null;
  summary: string | null;
  liveUrl: string | null;
  artifactUrls: string[] | null;
  verificationReport: {
    passed?: boolean;
    score?: number;
    recommendation?: string;
    revisionNotes?: string;
    findings?: string[];
    risks?: string[];
    evaluatedCommitSha?: string;
    completedAt?: string;
  } | null;
  lastError: string | null;
  reviewerFeedback: string | null;
  reviewerApprovedAt: string | null;
  clientReviewDueAt: string | null;
  clientFeedback: string | null;
  clientAcceptedAt: string | null;
  metadata?: {
    deliveryContract?: DeliveryContract;
    [key: string]: unknown;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectHandoffOverview {
  handoff: ProjectHandoff | null;
  contributors: ProjectContributor[];
  clientCanDecide: boolean;
  ratingsOpen: boolean;
}

export async function getProjectHandoff(projectId: string) {
  return request<ProjectHandoffOverview>(`/projects/${projectId}/handoff`);
}

export async function decideProjectHandoff(
  projectId: string,
  decision: 'accepted' | 'changes_requested',
  feedback?: string,
) {
  return mutate<Record<string, unknown>>(
    `/projects/${projectId}/handoff/decision`,
    { decision, feedback: feedback?.trim() || undefined },
  );
}

export async function rateProjectContributor(
  projectId: string,
  input: {
    ratedUserId: string;
    rating: number;
    categoryRatings?: Record<string, number>;
    comment?: string;
  },
) {
  return mutate<ProjectRating>(`/projects/${projectId}/handoff/ratings`, input);
}

export async function retryProjectHandoff(projectId: string) {
  return mutate<ProjectHandoff>(`/projects/${projectId}/handoff/retry`, {});
}

export function getDeliveryEvidenceRequirements(
  contract: DeliveryContract | null | undefined,
) {
  if (contract?.evidenceRequirements) return contract.evidenceRequirements;
  const deliverables = (contract?.deliverables ?? [])
    .map((item) => item.title)
    .join(' ')
    .toLowerCase();
  return {
    liveUrl:
      /\b(live|deployed|deployment|hosted|hosting|production)\b/.test(
        deliverables,
      ) || /\bworking (website|web app|application)\b/.test(deliverables),
    artifactUrls:
      /\b(figma|prototype|wireframe|mockup|design file|documentation|docs|manual|report)\b/.test(
        deliverables,
      ),
    sourceArchive: /\b(source|source code|codebase|repository|repo)\b/.test(
      deliverables,
    ),
  };
}

export async function downloadProjectSource(projectId: string) {
  try {
    const response = await api.get<Blob>(`/projects/${projectId}/handoff/source`, {
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] as
      | string
      | undefined;
    const fileName =
      disposition?.match(/filename="?([^";]+)"?/i)?.[1] ??
      `project-source-${projectId}.zip`;
    return { blob: response.data, fileName };
  } catch (error) {
    const responseData = (
      error as { response?: { data?: unknown } }
    ).response?.data;
    if (responseData instanceof Blob) {
      let payload: { message?: string | string[] } | null = null;
      try {
        payload = JSON.parse(await responseData.text()) as {
          message?: string | string[];
        };
      } catch {
        payload = null;
      }
      const message = Array.isArray(payload?.message)
        ? payload.message.join(', ')
        : payload?.message;
      if (message) throw new Error(message);
    }
    throw new Error(
      getApiErrorMessage(error, 'Could not download verified source'),
    );
  }
}

async function request<T>(url: string): Promise<T> {
  try {
    const { data } = await api.get<ApiData<T>>(url);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Could not load final delivery'));
  }
}

async function mutate<T>(url: string, body: Record<string, unknown>): Promise<T> {
  try {
    const { data } = await api.post<ApiData<T>>(url, body);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Could not save final delivery review'));
  }
}
