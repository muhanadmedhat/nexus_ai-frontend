"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DASHBOARD_BY_ROLE, type UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  role: UserRole;
  children: React.ReactNode;
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role !== role) {
      router.replace(DASHBOARD_BY_ROLE[user.role]);
    }
  }, [loading, user, role, router]);

  if (loading || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center text-sm text-on-surface-variant">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
