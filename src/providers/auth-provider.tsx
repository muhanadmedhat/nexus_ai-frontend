"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import { getMe, signOut } from "@/services/auth";
import type { AuthUser } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await getMe());
    } catch {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const currentUser = await getMe();
        if (active) setUser(currentUser);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
