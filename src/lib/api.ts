import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  clearAuthTokens,
  getAccessToken,
  setAuthTokens,
} from "./auth-tokens";

export const API_BASE_URL = "http://localhost:3001/api";

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
    briefMessages: (projectId: string) => `/projects/${projectId}/brief/messages`,
    briefReopen: (projectId: string) => `/projects/${projectId}/brief/reopen`,
    briefConfirm: (projectId: string) => `/projects/${projectId}/brief/confirm`,
  },
  freelancers: {
    me: "/freelancers/me",
  },
  freelancerVerification: {
    me: "/freelancer-verification/me",
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
    freelancerVerification: (id: string) => `/admin/freelancers/${id}/verification`,
    agentsOverview: "/admin/agents/overview",
    agentJobs: "/admin/agent-jobs",
    agentJobDetail: (id: string) => `/admin/agent-jobs/${id}`,
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

interface TokenResponse {
  accessToken: string;
}

interface ApiErrorResponse {
  message?: string | string[];
  error?: string;
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

// ===== INTERCEPTOR WITH DEBUG LOGS =====
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  console.log('🔑 [Interceptor] Token from getAccessToken():', token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('✅ [Interceptor] Authorization header set:', config.headers.Authorization);
  } else {
    console.warn('⚠️ [Interceptor] No token found – request will be unauthenticated.');
  }

  console.log('📤 [Interceptor] Request URL:', (config.baseURL || '') + (config.url || ''));

  return config;
});

// ===== RESPONSE INTERCEPTOR (temporarily disable clear on 401 for debugging) =====
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // If 401, we might want to clear tokens, but for debugging we'll just log
    if (error.response?.status === 401) {
      console.warn('⚠️ [Interceptor] Received 401 – token may be invalid or expired.');
      //TEMPORARILY DISABLED: clearAuthTokens(); // Uncomment later
    }
    throw error;
  },
);