import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { login as loginApi, getMe } from "../api/auth.api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const stored = localStorage.getItem("adminUser");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object" || !parsed.email) {
        localStorage.removeItem("adminUser");
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem("adminUser");
      localStorage.removeItem("adminToken");
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setAdmin(null);
  }, []);

  const login = async (email, password) => {
    const { data } = await loginApi(email, password);
    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminUser", JSON.stringify(data.admin));
    setAdmin(data.admin);
    return data;
  };

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then(({ data }) => {
        setAdmin(data.admin);
        localStorage.setItem("adminUser", JSON.stringify(data.admin));
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
