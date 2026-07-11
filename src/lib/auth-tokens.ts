const ACCESS_TOKEN_KEY = "nexus_ai_access_token";
const LEGACY_REFRESH_TOKEN_KEY = "nexus_ai_refresh_token";

interface AuthTokens {
  accessToken: string;
}

function storageAvailable() {
  return typeof window !== "undefined";
}

export function getAccessToken() {
  if (!storageAvailable()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return null;
}

export function setAccessToken(accessToken: string) {
  if (!storageAvailable()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function setAuthTokens(tokens: AuthTokens) {
  setAccessToken(tokens.accessToken);
}

export function clearAuthTokens() {
  if (!storageAvailable()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}
