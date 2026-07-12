import { api, getApiErrorMessage } from "@/lib/api";

// ===== Types =====

export interface AdminStats {
  users: {
    total: number;
    customers: number;
    freelancers: number;
    admins: number;
    emailVerified: number;
    emailPending: number;
  };
  projects: {
    total: number;
    draft: number;
    briefComplete: number;
    assigned: number;
    active: number;
    completed: number;
  };
  freelancers: {
    total: number;
    profileIncomplete: number;
    cvPending: number;
    assessmentPending: number;
    assessmentInProgress: number;
    assessmentSubmitted: number;
    approved: number;
    rejected: number;
  };
  assessments: {
    total: number;
    inProgress: number;
    submitted: number;
    passed: number;
    failed: number;
    needsReview: number;
  };
  agents: {
    queued: number;
    running: number;
    completedToday: number;
    failedToday: number;
    healthy: number;
    failing: number;
  };
}

export interface FreelancerListItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  headline: string | null;
  skills: string[];
  yearsExperience: number | null;
  cvUrl: string | null;
  verificationStatus: string;
  assessmentScore: string | null;
  assessmentSubmittedAt: string | null;
  createdAt: string;
}

export interface FreelancerDetail {
  profile: {
    id: string;
    userId: string;
    name: string;
    email: string;
    headline: string | null;
    bio: string | null;
    skills: string[];
    yearsExperience: number | null;
    hourlyRate: number | null;
    cvUrl: string | null;
    verificationStatus: string;
    assessmentScore: string | null;
    assessmentSubmittedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  assessment: {
    id: string;
    status: string;
    score: string | null;
    submittedAt: string | null;
    startedAt: string | null;
    expiresAt: string | null;
    questions: any[];
    answers: any[];
  } | null;
}

// ===== Agent Types =====

export interface AgentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'failing';
  queued: number;
  running: number;
  completedToday: number;
  failedToday: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
}

export interface AgentOverview {
  agents: AgentHealth[];
  totals: {
    queued: number;
    running: number;
    completedToday: number;
    failedToday: number;
  };
}

export interface AgentJob {
  id: string;
  jobType: string;
  status: string;
  userId: string | null;
  projectId: string | null;
  targetType: string | null;
  targetId: string | null;
  payload: any;
  result: any;
  error: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// ===== Assessment Types =====

export interface AssessmentListItem {
  id: string;
  freelancerName: string;
  freelancerEmail: string;
  score: string | null;
  status: string;
  recommendation: string | null;
  warningCount: number;
  submittedAt: string;
  startedAt: string;
}

export interface AssessmentDetail {
  id: string;
  freelancer: {
    id: string;
    name: string;
    email: string;
    headline: string | null;
  };
  status: string;
  score: string | null;
  recommendation: string | null;
  submittedAt: string;
  startedAt: string;
  expiresAt: string;
  questions: {
    id: string;
    type: string;
    skill: string;
    prompt: string;
    orderIndex: number;
    answer?: {
      value: string;
    };
    score?: number;
    feedback?: string;
  }[];
  eventsSummary: {
    total: number;
    focusLost: number;
    fullscreenExit: number;
  };
}

// ===== Admin Stats =====

export async function getAdminStats(): Promise<AdminStats> {
  try {
    const { data } = await api.get<{ status: string; data: AdminStats }>(
      "/admin/stats"
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load admin stats"));
  }
}

// ===== Freelancer Queue (with full filters) =====

export async function getFreelancers(params?: {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
  skills?: string[];
  dateFrom?: string;
  dateTo?: string;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.search) query.append("search", params.search);
  if (params?.skills && params.skills.length > 0) {
    query.append("skills", params.skills.join(","));
  }
  if (params?.dateFrom) query.append("dateFrom", params.dateFrom);
  if (params?.dateTo) query.append("dateTo", params.dateTo);

  const { data } = await api.get<{
    status: string;
    data: FreelancerListItem[];
    total: number;
    page: number;
    limit: number;
  }>(`/admin/freelancers?${query.toString()}`);

  return data;
}

export async function getFreelancerDetail(id: string) {
  const { data } = await api.get<{ status: string; data: FreelancerDetail }>(
    `/admin/freelancers/${id}`
  );
  return data.data;
}

export async function updateFreelancerVerification(
  id: string,
  payload: { status: "approved" | "rejected" | "interview_pending"; reason?: string }
) {
  const { data } = await api.patch<{ status: string; data: any }>(
    `/admin/freelancers/${id}/verification`,
    payload
  );
  return data.data;
}

// ===== Agent Overview =====

export async function getAgentOverview(): Promise<AgentOverview> {
  const { data } = await api.get<{ status: string; data: AgentOverview }>(
    "/admin/agents/overview"
  );
  return data.data;
}

export async function getAgentJobs(params?: {
  status?: string;
  jobType?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.jobType) query.append("jobType", params.jobType);
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));

  const { data } = await api.get<{
    status: string;
    data: AgentJob[];
    total: number;
    page: number;
    limit: number;
  }>(`/admin/agent-jobs?${query.toString()}`);

  return data;
}

export async function getAgentJobDetail(id: string): Promise<AgentJob> {
  const { data } = await api.get<{ status: string; data: AgentJob }>(
    `/admin/agent-jobs/${id}`
  );
  return data.data;
}

// ===== Assessment Review (with full filters) =====

export async function getAssessments(params?: {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minScore?: number;
  maxScore?: number;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.search) query.append("search", params.search);
  if (params?.dateFrom) query.append("dateFrom", params.dateFrom);
  if (params?.dateTo) query.append("dateTo", params.dateTo);
  if (params?.minScore !== undefined) query.append("minScore", String(params.minScore));
  if (params?.maxScore !== undefined) query.append("maxScore", String(params.maxScore));

  const { data } = await api.get<{
    status: string;
    data: AssessmentListItem[];
    total: number;
    page: number;
    limit: number;
  }>(`/admin/assessments?${query.toString()}`);

  return data;
}

export async function getAssessmentDetail(id: string) {
  const { data } = await api.get<{ status: string; data: AssessmentDetail }>(
    `/admin/assessments/${id}`
  );
  return data.data;
}

export async function reviewAssessment(
  id: string,
  payload: { decision: "pass" | "fail" | "needs_review"; notes?: string; scoreOverride?: number }
) {
  const { data } = await api.patch<{ status: string; data: any }>(
    `/admin/assessments/${id}/review`,
    payload
  );
  return data.data;
}