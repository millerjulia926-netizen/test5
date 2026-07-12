import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  clearTokens,
  login as apiLogin,
  logoutFromServer,
  restoreSession,
  setTokens,
  signup as apiSignup,
} from "../api/notes";

type AuthContextValue = {
  isAuthenticated: boolean;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    void restoreSession()
      .then((restored) => {
        setIsAuthenticated(restored);
      })
      .finally(() => {
        setIsRestoring(false);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      isRestoring,
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
      async logout() {
        await logoutFromServer();
        clearTokens();
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated, isRestoring],
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
