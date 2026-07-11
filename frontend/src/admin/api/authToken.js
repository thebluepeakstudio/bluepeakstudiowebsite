const STORAGE_KEY = "bps_admin_session";

/** In-memory cache so axios can read the token synchronously on the same tick as login. */
let memoryToken = null;

export function getAuthToken() {
  if (memoryToken) return memoryToken;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  memoryToken = token || null;
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing or storage blocked — memory-only for this tab
  }
}

export function clearAuthToken() {
  memoryToken = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
