import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  clearAuthTokens,
  getAccessToken,
  setAuthTokens,
} from "./auth-tokens";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

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
  admin: {
    users: "/admin/users",
    projects: "/admin/projects",
    stats: "/admin/stats",
  },
  ai: {
    extractCv: "/ai/extract-cv",
    validateBrief: "/ai/validate-brief",
    generateAssessment: "/ai/generate-assessment",
    gradeAssessment: "/ai/grade-assessment",
  },
} as const;

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

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
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
