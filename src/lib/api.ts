import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
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
    profileImage: "/users/profile-image",
    freelancerCv: "/users/freelancer-cv",
  },
  freelancers: {
    me: "/freelancers/me",
  },
  projects: {
    base: "/projects",
    detail: (id: string) => `/projects/${id}`,
  },
  admin: {
    users: "/admin/users",
    projects: "/admin/projects",
    stats: "/admin/stats",
  },
  freelancerVerification: {
    me: "/freelancer-verification/me",
  },
  freelancerAssessments: {
    start: "/freelancer-assessments/start",
    current: "/freelancer-assessments/current",
    answers: (id: string) => `/freelancer-assessments/${id}/answers`,
    submit: (id: string) => `/freelancer-assessments/${id}/submit`,
    events: (id: string) => `/freelancer-assessments/${id}/events`,
  },
  notifications: {
    base: "/notifications",
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: "/notifications/read-all",
  },
} as const;

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
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
});

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (error.response?.data?.error) return error.response.data.error;
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

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuthTokens();
      throw error;
    }

    originalRequest._retry = true;

    try {
      const { data } = await axios.post<TokenResponse>(
        API_ENDPOINTS.auth.refresh,
        { refreshToken },
        { baseURL: API_BASE_URL },
      );

      setAuthTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      return api(originalRequest);
    } catch (refreshError) {
      clearAuthTokens();
      throw refreshError;
    }
  },
);