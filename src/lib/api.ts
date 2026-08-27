import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearAuthTokens, getAccessToken, setAuthTokens } from "./auth-tokens";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export const API_ENDPOINTS = {
  health: "/health",
  auth: {
    signup: "/auth/signup",
    login: "/auth/login",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    google: "/auth/google",
    googleCallback: "/auth/google/callback",
    exchange: "/auth/exchange",
    completeProfile: "/auth/complete-profile",
    resendVerification: "/auth/resend-verification",
    verifyEmail: "/auth/verify-email",
    sendPhoneVerification: "/auth/phone/send-verification",
    verifyPhone: "/auth/phone/verify",
  },
  users: {
    me: "/users/me",
  },
  uploads: {
    profileImage: "/uploads/profile-image",
    freelancerCv: "/uploads/freelancer-cv",
  },
  projects: {
    base: "/projects",
    detail: (id: string) => `/projects/${id}`,
    brief: (projectId: string) => `/projects/${projectId}/brief`,
    briefMessages: (projectId: string) =>
      `/projects/${projectId}/brief/messages`,
    briefDocuments: (projectId: string) =>
      `/projects/${projectId}/brief/documents`,
    briefDocumentDownload: (projectId: string, documentId: string) =>
      `/projects/${projectId}/brief/documents/${documentId}/download`,
    briefReopen: (projectId: string) => `/projects/${projectId}/brief/reopen`,
    briefConfirm: (projectId: string) => `/projects/${projectId}/brief/confirm`,
  },
  freelancers: {
    me: "/freelancers/me",
    principalReviewerApplication:
      "/freelancers/me/principal-reviewer/application",
  },
  freelancerVerification: {
    me: "/freelancer-verification/me",
    retryCvExtraction: "/freelancer-verification/me/cv-extraction/retry",
    retryAssessmentGeneration:
      "/freelancer-verification/me/assessment-generation/retry",
  },
  freelancerAssessments: {
    start: "/freelancer-assessments/start",
    current: "/freelancer-assessments/current",
    detail: (id: string) => `/freelancer-assessments/${id}`,
    answers: (id: string) => `/freelancer-assessments/${id}/answers`,
    submit: (id: string) => `/freelancer-assessments/${id}/submit`,
    events: (id: string) => `/freelancer-assessments/${id}/events`,
  },
  admin: {
    users: "/admin/users",
    projects: "/admin/projects",
    stats: "/admin/stats",
    freelancers: "/admin/freelancers",
    freelancerDetail: (id: string) => `/admin/freelancers/${id}`,
    freelancerVerification: (id: string) =>
      `/admin/freelancers/${id}/verification`,
    principalReviewerReview: (id: string) =>
      `/admin/freelancers/${id}/principal-reviewer`,
    agentsOverview: "/admin/agents/overview",
    agentJobs: "/admin/agent-jobs",
    agentJobDetail: (id: string) => `/admin/agent-jobs/${id}`,
    automationIncidents: "/admin/automation/incidents",
    automationIncidentSummary: "/admin/automation/incidents/summary",
    automationIncidentDetail: (id: string) =>
      `/admin/automation/incidents/${id}`,
    resolveAutomationIncident: (id: string) =>
      `/admin/automation/incidents/${id}/resolve`,
    assessmentDetail: (id: string) => `/admin/assessments/${id}`,
    assessmentReview: (id: string) => `/admin/assessments/${id}/review`,
  },
  ai: {
    extractCv: "/ai/extract-cv",
    validateBrief: "/ai/validate-brief",
    generateAssessment: "/ai/generate-assessment",
    gradeAssessment: "/ai/grade-assessment",
  },
  notifications: {
    base: "/notifications",
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: "/notifications/read-all",
  },
} as const;

export const sprint4Endpoints = {
  matching: {
    startPlanningRoles: (projectId: string) =>
      `/projects/${projectId}/matching/planning-roles`,
    projectRuns: (projectId: string) => `/projects/${projectId}/matching/runs`,
    runDetail: (runId: string) => `/matching/runs/${runId}`,
    candidateStatus: (candidateId: string) =>
      `/matching/candidates/${candidateId}/status`,
    reviewRun: (runId: string) => `/matching/runs/${runId}/review`,
  },
  roleAssignments: {
    create: (projectId: string) => `/projects/${projectId}/role-assignments`,
    projectList: (projectId: string) =>
      `/projects/${projectId}/role-assignments`,
    updateStatus: (assignmentId: string) =>
      `/project-role-assignments/${assignmentId}/status`,
    projectTeam: (projectId: string) => `/projects/${projectId}/team`,
    freelancerAssigned: "/freelancer/projects/assigned",
    freelancerProjectAssignment: (projectId: string) =>
      `/freelancer/projects/${projectId}/assignment`,
  },
  planning: {
    createSubmission: (projectId: string) =>
      `/projects/${projectId}/planning-submissions`,
    uploadArtifact: (projectId: string) =>
      `/projects/${projectId}/planning-artifacts`,
    projectSubmissions: (projectId: string) =>
      `/projects/${projectId}/planning-submissions`,
    requirements: (
      projectId: string,
      submissionType: "architecture" | "ui_ux",
    ) => `/projects/${projectId}/planning-requirements/${submissionType}`,
    submissionDetail: (submissionId: string) =>
      `/planning-submissions/${submissionId}`,
    reviewSubmission: (submissionId: string) =>
      `/planning-submissions/${submissionId}/review`,
    retrySubmissionEvaluation: (submissionId: string) =>
      `/planning-submissions/${submissionId}/evaluation/retry`,
    generatePlan: (projectId: string) =>
      `/projects/${projectId}/plans/generate`,
    projectPlans: (projectId: string) => `/projects/${projectId}/plans`,
    planDetail: (planId: string) => `/project-plans/${planId}`,
    reviewPlan: (planId: string) => `/project-plans/${planId}/review`,
    materializePlan: (planId: string) => `/project-plans/${planId}/materialize`,
    milestones: (projectId: string) => `/projects/${projectId}/milestones`,
    tasks: (projectId: string) => `/projects/${projectId}/tasks`,
    freelancerTasks: "/freelancer/tasks",
    updateTask: (taskId: string) => `/project-tasks/${taskId}`,
  },
  adminSprint4: {
    matchingRuns: "/admin/matching/runs",
    matchingDiagnostics: "/admin/matching/diagnostics",
    planningSubmissions: "/admin/planning/submissions",
    projectPlans: "/admin/project-plans",
    payments: "/admin/payments",
  },
  payments: {
    customerSetupIntent: "/payments/customer/setup-intent",
    customerProjects: "/payments/customer/projects",
    freelancerOnboardingLink: "/payments/freelancer/onboarding-link",
    freelancerDashboardLink: "/payments/freelancer/dashboard-link",
    freelancerAccount: "/payments/freelancer/account",
    escrowIntent: (projectId: string) =>
      `/projects/${projectId}/payments/escrow-intent`,
    checkoutSession: (projectId: string) =>
      `/projects/${projectId}/payments/checkout-session`,
    syncCheckoutSession: (projectId: string, sessionId: string) =>
      `/projects/${projectId}/payments/checkout-session/${sessionId}/sync`,
    projectSummary: (projectId: string) =>
      `/projects/${projectId}/payments/summary`,
    projectPayments: (projectId: string) => `/projects/${projectId}/payments`,
    release: (projectId: string, paymentId: string) =>
      `/projects/${projectId}/payments/${paymentId}/release`,
  },
};

export const deliveryEndpoints = {
  repositories: {
    create: (projectId: string) => `/projects/${projectId}/repository`,
    projectRepository: (projectId: string) =>
      `/projects/${projectId}/repository`,
    syncCollaborators: (projectId: string) =>
      `/projects/${projectId}/repository/collaborators/sync`,
    syncEvaluationWebhook: (projectId: string) =>
      `/projects/${projectId}/repository/evaluation-webhook/sync`,
    resendInvite: (collaboratorId: string) =>
      `/repository-collaborators/${collaboratorId}/resend-invite`,
    adminList: "/admin/repositories",
  },
  implementationMatching: {
    startTasks: (projectId: string) =>
      `/projects/${projectId}/matching/implementation-tasks`,
    assignTask: (taskId: string) => `/project-tasks/${taskId}/assignment`,
  },
  submissions: {
    create: (projectId: string) => `/projects/${projectId}/submissions`,
    projectList: (projectId: string) => `/projects/${projectId}/submissions`,
    detail: (submissionId: string) => `/project-submissions/${submissionId}`,
    update: (submissionId: string) => `/project-submissions/${submissionId}`,
    submit: (submissionId: string) =>
      `/project-submissions/${submissionId}/submit`,
    review: (submissionId: string) =>
      `/project-submissions/${submissionId}/review`,
    freelancerList: "/freelancer/submissions",
    adminList: "/admin/submissions",
  },
  revisions: {
    create: (projectId: string) => `/projects/${projectId}/revision-requests`,
    projectList: (projectId: string) =>
      `/projects/${projectId}/revision-requests`,
    updateStatus: (revisionRequestId: string) =>
      `/revision-requests/${revisionRequestId}/status`,
  },
  evaluations: {
    create: (submissionId: string) =>
      `/project-submissions/${submissionId}/evaluations`,
    submissionList: (submissionId: string) =>
      `/project-submissions/${submissionId}/evaluations`,
    detail: (evaluationRunId: string) => `/evaluation-runs/${evaluationRunId}`,
    retry: (evaluationRunId: string) =>
      `/evaluation-runs/${evaluationRunId}/retry`,
    adminList: "/admin/evaluations",
  },
  releaseRequests: {
    create: (projectId: string) =>
      `/projects/${projectId}/payment-release-requests`,
    projectList: (projectId: string) =>
      `/projects/${projectId}/payment-release-requests`,
    adminList: "/admin/payment-release-requests",
    review: (requestId: string) =>
      `/payment-release-requests/${requestId}/review`,
  },
};

interface TokenResponse {
  accessToken: string;
}

interface ApiErrorResponse {
  message?: string | string[];
  error?: string;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (error.response?.data?.error) return error.response.data.error;
    if (error.response) return fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      throw error;
    }

    originalRequest._retry = true;

    try {
      const { data } = await axios.post<TokenResponse>(
        API_ENDPOINTS.auth.refresh,
        null,
        { baseURL: API_BASE_URL, withCredentials: true },
      );

      setAuthTokens({
        accessToken: data.accessToken,
      });

      return api(originalRequest);
    } catch (refreshError) {
      clearAuthTokens();
      throw refreshError;
    }
  },
);
