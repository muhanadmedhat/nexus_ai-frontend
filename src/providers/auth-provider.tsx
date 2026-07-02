"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
    setUser(await getMe());
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  useEffect(() => {
    // Fires immediately with the current session, then on every auth change.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      setUser(await getMe());
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
