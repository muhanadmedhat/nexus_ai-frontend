import { api, getApiErrorMessage } from "@/lib/api";
import { getFreelancerAssignedProjects } from "@/services/matching";

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
  attention: ReviewerAttention;
}

export interface ReviewerAttention {
  planningAwaitingReview: number;
  generatedPlans: number;
  matchingRuns: number;
  submissionsAwaitingReview: number;
  releaseRequests: number;
  openTasks: number;
  finalHandoffsAwaitingReview: number;
}

export interface ReviewerMatchingInvitation {
  id: string;
  candidateId: string | null;
  status: string;
  expiresAt: string;
  respondedAt: string | null;
  responseReason: string | null;
}

export interface ReviewerSelectedAssignment {
  id: string;
  roleKey: string;
  status: string;
  freelancerProfileId: string | null;
  sourceMatchingRunId: string | null;
  sourceCandidateId: string | null;
  freelancer: {
    id: string;
    name: string | null;
    githubUsername: string | null;
  } | null;
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
  selectedAssignment: ReviewerSelectedAssignment | null;
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
  /** Unit for hourlyRate; absent on responses from before ISSUES.md #9. */
  hourlyRateCurrency?: string | null;
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

/** One AI check against a single project requirement. */
export interface ReviewerEvaluationCheck {
  key: string;
  title: string;
  status: "met" | "partial" | "missing" | "conflict" | "not_applicable";
  severity?: string | null;
  mandatory?: boolean;
  evidence?: string | null;
  feedback?: string | null;
}

/** What the freelancer actually wrote and attached for one requirement. */
export interface ReviewerRequirementEvidence {
  summary?: string | null;
  urls?: string[];
  disposition?: string | null;
  notApplicableReason?: string | null;
}

/**
 * Full planning submission as the principal reviewer needs to see it: the
 * freelancer's own answers alongside the AI's verdict on each requirement.
 * The endpoint already returned all of this; nothing in the UI used to ask
 * for it, so the reviewer decided blind. See ISSUES.md #30.
 */
export interface ReviewerPlanningSubmissionDetail {
  id: string;
  projectId: string;
  submissionType: string;
  version: number;
  status: string;
  title: string | null;
  summary: string | null;
  submittedAt: string | null;
  freelancer?: { name?: string | null; headline?: string | null } | null;
  content?: {
    requirementEvidence?: Record<string, ReviewerRequirementEvidence>;
  } | null;
  fileUrls?: Record<string, unknown> | null;
  evaluationStatus?: string | null;
  evaluationScore?: number | string | null;
  evaluationRecommendation?: string | null;
  evaluationRequirements?: Array<{
    key: string;
    title: string;
    description?: string | null;
    mandatory?: boolean;
    requiresUrl?: boolean;
  }> | null;
  evaluationResult?: {
    checks?: ReviewerEvaluationCheck[];
    risks?: string[];
    strengths?: string[];
    summary?: string | null;
  } | null;
  adminNotes?: string | null;
  aiOverride?: boolean | null;
  aiOverrideReason?: string | null;
}

export async function getReviewerProjects() {
  try {
    return await request<ReviewerProject[]>("/reviewer/projects");
  } catch (reviewerDirectoryError) {
    try {
      const fallback = await getFreelancerAssignedProjects({
        phase: "governance",
        status: "accepted,in_progress,completed",
        limit: 100,
      });
      return fallback.data
        .filter((assignment) => assignment.roleKey === "principal_reviewer")
        .map(
          (assignment): ReviewerProject => ({
            assignmentId: assignment.assignmentId,
            status: assignment.status,
            acceptedAt: null,
            budgetAmount:
              assignment.allocatedAmount == null
                ? null
                : String(assignment.allocatedAmount),
            currency: assignment.currency,
            project: {
              id: assignment.projectId,
              title: assignment.projectTitle || "Assigned project",
              status: assignment.status,
              deadline: assignment.deadline,
            },
            attention: emptyReviewerAttention(),
          }),
        );
    } catch {
      throw reviewerDirectoryError;
    }
  }
}

function emptyReviewerAttention(): ReviewerAttention {
  return {
    planningAwaitingReview: 0,
    generatedPlans: 0,
    matchingRuns: 0,
    submissionsAwaitingReview: 0,
    releaseRequests: 0,
    openTasks: 0,
    finalHandoffsAwaitingReview: 0,
  };
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

export async function getReviewerPlanningSubmission(id: string) {
  return request<ReviewerPlanningSubmissionDetail>(
    `/reviewer/planning-submissions/${id}`,
  );
}

export async function getReviewerPlans(projectId: string) {
  return requestPage<Record<string, unknown>>(
    `/reviewer/projects/${projectId}/plans`,
  );
}

/** A plan as the reviewer needs to see it before approving the build. */
export interface ReviewerPlanDetail {
  id: string;
  version?: number | null;
  status?: string | null;
  summary?: string | null;
  assumptions?: string[] | null;
  milestones?: Array<{
    // Persisted plans use `key`; the generator's own schema uses `clientKey`.
    key?: string;
    clientKey?: string;
    title?: string;
    description?: string | null;
    startDay?: number | null;
    estimatedDays?: number | null;
    acceptanceCriteria?: string[] | null;
  }> | null;
  tasks?: Array<{
    key?: string;
    clientKey?: string;
    title?: string;
    description?: string | null;
    milestoneKey?: string;
    milestoneClientKey?: string;
    roleKey?: string | null;
    estimatedHours?: number | null;
    durationDays?: number | null;
    startDay?: number | null;
    budgetAmount?: string | number | null;
    currency?: string | null;
    requiredSkills?: string[] | null;
  }> | null;
  teamPlan?: Record<string, unknown> | null;
  adminNotes?: string | null;
}

export interface ReviewerPlanReviewResult {
  id?: string;
  status?: string;
  regeneration?: {
    queued: boolean;
    reason?: string;
    agentJobId?: string;
    queueName?: string;
    error?: string;
  };
  [key: string]: unknown;
}

export async function getReviewerPlan(id: string) {
  return request<ReviewerPlanDetail>(`/reviewer/project-plans/${id}`);
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
  return mutate(
    `/reviewer/project-plans/${id}/review`,
    "patch",
    payload,
  ) as Promise<ReviewerPlanReviewResult>;
}

export async function reviewReviewerSubmission(
  id: string,
  payload: Record<string, unknown>,
) {
  return mutate(`/reviewer/submissions/${id}/review`, "patch", payload);
}

export async function retryReviewerSubmissionEvaluation(id: string) {
  return mutate(`/reviewer/submissions/${id}/evaluation/retry`, "post", {});
}

export async function retargetReviewerSubmissionPullRequest(id: string) {
  return mutate(
    `/reviewer/submissions/${id}/pull-request/retarget`,
    "post",
    {},
  );
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
