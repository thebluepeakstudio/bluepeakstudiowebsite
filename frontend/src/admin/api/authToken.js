const STORAGE_KEY = "bps_admin_session";

/** In-memory Bearer fallback for the current tab session (not persisted). */
let memoryToken = null;

function clearLegacyStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
  } catch {
    // ignore
  }
}

// One-time migration: remove tokens previously stored in localStorage
clearLegacyStorage();

export function getAuthToken() {
  return memoryToken;
}

export function setAuthToken(token) {
  memoryToken = token || null;
}

export function clearAuthToken() {
  memoryToken = null;
  clearLegacyStorage();
}
