const STORAGE_KEY = "bps_admin_session";

function readStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Hydrate from storage on load so refresh/new tab can auth before React mounts. */
let memoryToken = readStoredToken();

export function getAuthToken() {
  if (memoryToken) return memoryToken;
  memoryToken = readStoredToken();
  return memoryToken;
}

export function setAuthToken(token) {
  memoryToken = token || null;
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked — memory-only until tab closes
  }
}

export function clearAuthToken() {
  memoryToken = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
