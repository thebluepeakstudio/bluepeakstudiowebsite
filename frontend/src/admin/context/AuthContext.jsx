import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { login as loginApi, logout as logoutApi, getMe } from "../api/auth.api";

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
    setAdmin(null);
  }, []);

  const login = async (email, password) => {
    const { data } = await loginApi(email, password);
    setAdmin(data.admin);
    return data;
  };

  useEffect(() => {
    // Clear legacy localStorage auth from before httpOnly cookie migration
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");

    getMe()
      .then(({ data }) => {
        setAdmin(data.admin);
      })
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
