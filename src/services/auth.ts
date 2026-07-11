import axios from "axios";
import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";
import {
  clearAuthTokens,
  getAccessToken,
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
  cvUrl?: string | null;
}

interface TokenResponse {
  accessToken: string;
}

interface AuthExchangeResponse extends TokenResponse {
  isProfileComplete: boolean;
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
    cvUrl: row.cvUrl ?? null,
  };
}

export async function refreshAccessToken(): Promise<string> {
  const { data } = await api.post<TokenResponse>(API_ENDPOINTS.auth.refresh);
  setAuthTokens({ accessToken: data.accessToken });
  return data.accessToken;
}

export async function signIn(email: string, password: string) {
  try {
    const { data } = await api.post<TokenResponse>(API_ENDPOINTS.auth.login, {
      email,
      password,
    });

    setAuthTokens({
      accessToken: data.accessToken,
    });
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Invalid email or password"));
  }
}

export async function signOut() {
  const accessToken = getAccessToken();

  try {
    if (accessToken) {
      await api.post(API_ENDPOINTS.auth.logout);
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
    });
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Registration failed"));
  }
}

export async function exchangeAuthCode(code: string): Promise<AuthExchangeResponse> {
  try {
    const { data } = await api.post<AuthExchangeResponse>(API_ENDPOINTS.auth.exchange, {
      code,
    });

    setAuthTokens({ accessToken: data.accessToken });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not complete Google sign in"));
  }
}

export async function completeProfile(input: {
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  role: Exclude<AuthUser["role"], "admin">;
}): Promise<AuthUser> {
  try {
    const { data } = await api.post<TokenResponse & { user: BackendUser }>(
      API_ENDPOINTS.auth.completeProfile,
      input,
    );

    setAuthTokens({ accessToken: data.accessToken });
    return toAuthUser(data.user);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not complete profile"));
  }
}

export async function resendVerificationEmail(): Promise<void> {
  try {
    await api.post(API_ENDPOINTS.auth.resendVerification);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not send verification code"));
  }
}

export async function verifyEmail(code: string): Promise<void> {
  try {
    const { data } = await api.post<TokenResponse>(API_ENDPOINTS.auth.verifyEmail, {
      code,
    });
    setAuthTokens({ accessToken: data.accessToken });
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not verify email"));
  }
}

export async function getMe(): Promise<AuthUser | null> {
  if (!getAccessToken()) {
    try {
      await refreshAccessToken();
    } catch {
      clearAuthTokens();
      return null;
    }
  }

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
