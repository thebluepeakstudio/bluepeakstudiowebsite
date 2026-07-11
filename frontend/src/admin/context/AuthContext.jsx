import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { login as loginApi, logout as logoutApi, getMe } from "../api/auth.api";
import { clearAuthToken, getAuthToken, setAuthToken } from "../api/authToken";

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
    // Clear legacy localStorage keys from older auth shapes (not the session token)
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");

    const token = getAuthToken();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }

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
