"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DASHBOARD_BY_ROLE, type UserRole } from "@/types/auth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? DASHBOARD_BY_ROLE[user.role as UserRole] : "/login");
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center text-sm text-on-surface-variant">
      Loading…
    </div>
  );
}