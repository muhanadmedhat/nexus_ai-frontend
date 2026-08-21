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

export interface ReviewerMatchingInvitation {
  id: string;
  candidateId: string | null;
  status: string;
  expiresAt: string;
  respondedAt: string | null;
  responseReason: string | null;
}

export interface ReviewerMatchingRun {
  id: string;
  projectId: string;
  targetType: string;
  targetRoleKey: string | null;
  targetTaskId: string | null;
  taskTitle: string | null;
  status: string;
  summary: string | null;
  candidateCount: number;
  selectedCandidateId: string | null;
  invitation: ReviewerMatchingInvitation | null;
  reviewedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ReviewerCandidateProfile {
  id: string;
  name: string | null;
  email: string | null;
  headline: string | null;
  bio: string | null;
  summary: Record<string, unknown> | null;
  githubUsername: string | null;
  cvUrl: string | null;
  hourlyRate: number | null;
  recommendedHourlyRate: number | null;
  availabilityHours: number | null;
  yearsExperience: number | null;
  topSkills: string[];
  assessmentScore: number | null;
  interviewScore: number | null;
  performanceScore: number;
  avgRating: number | null;
  ratingsCount: number;
  completedTasks: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  missedDeadlines: number;
  projectRemovals: number;
  riskFlags: Record<string, unknown>[];
  isAvailable: boolean;
  verificationStatus: string;
}

export interface ReviewerMatchingCandidate {
  id: string;
  freelancerProfileId: string | null;
  rank: number;
  score: string | number;
  scoreBreakdown: Record<string, unknown> | null;
  rationale: string | null;
  evidence: Record<string, unknown> | null;
  status: string;
  freelancer: ReviewerCandidateProfile | null;
}

export interface ReviewerMatchingRunDetail extends ReviewerMatchingRun {
  projectTitle: string | null;
  task: {
    id: string;
    title: string;
    description: string | null;
    roleKey: string | null;
    requiredSkills: string[];
    startsAt: string | null;
    dueAt: string | null;
    dependencies: Array<{
      dependsOnTaskId: string;
      type: string;
      notes: string | null;
    }>;
  } | null;
  candidates: ReviewerMatchingCandidate[];
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

export async function getReviewerMatchingRuns(projectId: string) {
  return requestPage<ReviewerMatchingRun>(
    `/reviewer/projects/${projectId}/matching-runs`,
  );
}

export async function getReviewerMatchingRun(id: string) {
  return request<ReviewerMatchingRunDetail>(`/reviewer/matching-runs/${id}`);
}

export async function reviewReviewerMatchingRun(
  id: string,
  payload: {
    decision: "approved" | "rejected" | "rerun_required";
    selectedCandidateId?: string;
    notes?: string;
  },
) {
  return mutate(`/reviewer/matching-runs/${id}/review`, "post", payload);
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
    "patch",
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
