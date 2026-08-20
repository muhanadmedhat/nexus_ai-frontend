import { api, getApiErrorMessage } from "@/lib/api";

type ApiData<T> = { status: string; data: T };
type Paged<T> = { data: T[]; total?: number };

export interface ReviewerProject {
  assignmentId: string;
  status: string;
  acceptedAt: string | null;
  budgetAmount: string | null;
  currency: string | null;
  project: {
    id: string;
    title: string;
    status: string;
    automationStatus?: string;
    deadline?: string | null;
  };
}

export async function getReviewerProjects() {
  return request<ReviewerProject[]>("/reviewer/projects");
}

export async function getReviewerOverview(projectId: string) {
  return request<Record<string, unknown>>(
    `/reviewer/projects/${projectId}/overview`,
  );
}

export async function getReviewerPlanningSubmissions(projectId: string) {
  return requestPage<Record<string, unknown>>(
    `/reviewer/projects/${projectId}/planning-submissions`,
  );
}

export async function getReviewerPlans(projectId: string) {
  return requestPage<Record<string, unknown>>(
    `/reviewer/projects/${projectId}/plans`,
  );
}

export async function getReviewerSubmissions(projectId: string) {
  return requestPage<Record<string, unknown>>(
    `/reviewer/projects/${projectId}/submissions`,
  );
}

export async function getReviewerReleaseRequests(projectId: string) {
  return requestPage<Record<string, unknown>>(
    `/reviewer/projects/${projectId}/payment-release-requests`,
  );
}

export async function getReviewerHandoff(projectId: string) {
  return request<Record<string, unknown> | null>(
    `/reviewer/projects/${projectId}/handoff`,
  );
}

export async function reviewReviewerHandoff(
  projectId: string,
  payload: Record<string, unknown>,
) {
  return mutate(
    `/reviewer/projects/${projectId}/handoff/review`,
    'patch',
    payload,
  );
}

export async function getReviewerSubmission(id: string) {
  return request<Record<string, unknown>>(`/reviewer/submissions/${id}`);
}

export async function reviewReviewerPlanningSubmission(
  id: string,
  payload: Record<string, unknown>,
) {
  return mutate(
    `/reviewer/planning-submissions/${id}/review`,
    "patch",
    payload,
  );
}

export async function reviewReviewerPlan(
  id: string,
  payload: Record<string, unknown>,
) {
  return mutate(`/reviewer/project-plans/${id}/review`, "patch", payload);
}

export async function reviewReviewerSubmission(
  id: string,
  payload: Record<string, unknown>,
) {
  return mutate(`/reviewer/submissions/${id}/review`, "patch", payload);
}

export async function reviewReviewerRelease(
  id: string,
  payload: Record<string, unknown>,
) {
  return mutate(
    `/reviewer/payment-release-requests/${id}/review`,
    "patch",
    payload,
  );
}

async function request<T>(url: string): Promise<T> {
  try {
    const { data } = await api.get<ApiData<T>>(url);
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load reviewer workspace"),
    );
  }
}

async function requestPage<T>(url: string): Promise<T[]> {
  try {
    const { data } = await api.get<Paged<T>>(url);
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load review queue"));
  }
}

async function mutate(
  url: string,
  method: "patch" | "post",
  payload: Record<string, unknown>,
) {
  try {
    const { data } = await api.request<ApiData<Record<string, unknown>>>({
      url,
      method,
      data: payload,
    });
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not save reviewer decision"),
    );
  }
}
