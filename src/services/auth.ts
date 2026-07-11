import axios from "axios";
import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "@/lib/auth-tokens";
import type { AuthUser, RegisterInput } from "@/types/auth";

interface BackendUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  role: AuthUser["role"];
  photoUrl: string | null;
  isEmailVerified: boolean;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface MeResponse {
  user: BackendUser | null;
}

function toAuthUser(row: BackendUser): AuthUser {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phoneNumber: row.phoneNumber,
    role: row.role,
    photoUrl: row.photoUrl,
    isEmailVerified: row.isEmailVerified ?? false,
  };
}

export async function signIn(email: string, password: string) {
  try {
    const { data } = await api.post<TokenResponse>(API_ENDPOINTS.auth.login, {
      email,
      password,
    });

    setAuthTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Invalid email or password"));
  }
}

export async function signOut() {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  try {
    if (accessToken && refreshToken) {
      await api.post(API_ENDPOINTS.auth.logout, { refreshToken });
    }
  } finally {
    clearAuthTokens();
  }
}

export async function signUp(input: RegisterInput): Promise<void> {
  try {
    const { data } = await api.post<TokenResponse>(API_ENDPOINTS.auth.signup, input);

    setAuthTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Registration failed"));
  }
}

export async function getMe(): Promise<AuthUser | null> {
  if (!getAccessToken()) return null;

  try {
    const { data } = await api.get<MeResponse>(API_ENDPOINTS.users.me);
    return data.user ? toAuthUser(data.user) : null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthTokens();
      return null;
    }

    throw error;
  }
}