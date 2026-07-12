import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  clearTokens,
  getAccessToken,
  login as apiLogin,
  restoreSession,
  setTokens,
  signup as apiSignup,
} from "../api/notes";

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    void restoreSession().then((restored) => {
      if (restored) {
        setIsAuthenticated(true);
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      async login(email, password) {
        const tokens = await apiLogin(email, password);
        setTokens(tokens);
        setIsAuthenticated(true);
      },
      async signup(email, password) {
        const tokens = await apiSignup(email, password);
        setTokens(tokens);
        setIsAuthenticated(true);
      },
      logout() {
        clearTokens();
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
