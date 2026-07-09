const ACCESS_TOKEN_KEY = "nexus_ai_access_token";
const REFRESH_TOKEN_KEY = "nexus_ai_refresh_token";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function storageAvailable() {
  return typeof window !== "undefined";
}

export function getAccessToken() {
  if (!storageAvailable()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (!storageAvailable()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(tokens: AuthTokens) {
  if (!storageAvailable()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearAuthTokens() {
  if (!storageAvailable()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
