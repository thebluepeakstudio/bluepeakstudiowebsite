import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { login as loginApi, logout as logoutApi, getMe } from "../api/auth.api";
import { clearAuthToken, setAuthToken } from "../api/authToken";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Session may already be expired
    }
    clearAuthToken();
    setAdmin(null);
  }, []);

  const login = async (email, password) => {
    const { data } = await loginApi(email, password);
    if (data.token) setAuthToken(data.token);
    setAdmin(data.admin);
    return data;
  };

  useEffect(() => {
    // Restore session via HttpOnly cookie (and in-memory Bearer if set this tab)
    getMe()
      .then(({ data }) => {
        setAdmin(data.admin);
      })
      .catch(() => {
        clearAuthToken();
        setAdmin(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
