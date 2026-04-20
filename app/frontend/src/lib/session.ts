import axios from "axios";

const AUTH_TOKEN_KEY = "rw-auth-token";
const AUTH_EXPIRES_AT_KEY = "rw-auth-expires-at";
const LEGACY_AUTH_TOKEN_KEY = "token";

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const parseExpiresAt = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const applyAuthHeader = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
};

export const clearAuthSession = () => {
  if (canUseStorage()) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  }
  applyAuthHeader(null);
};

export const setAuthSession = (token: string, expiresAt?: number | null) => {
  if (!token) return;
  if (canUseStorage()) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, token);
    if (expiresAt && Number.isFinite(expiresAt)) {
      window.localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(expiresAt));
    } else {
      window.localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
    }
  }
  applyAuthHeader(token);
};

export const getAuthToken = (): string | null => {
  if (!canUseStorage()) return null;
  let token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    const legacyToken = window.localStorage.getItem(LEGACY_AUTH_TOKEN_KEY);
    if (legacyToken) {
      token = legacyToken;
      window.localStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
    }
  }
  if (!token) return null;

  const expiresAt = parseExpiresAt(window.localStorage.getItem(AUTH_EXPIRES_AT_KEY));
  if (expiresAt && Date.now() / 1000 >= expiresAt) {
    clearAuthSession();
    return null;
  }
  return token;
};

export const initializeAuthSession = () => {
  applyAuthHeader(getAuthToken());
};
