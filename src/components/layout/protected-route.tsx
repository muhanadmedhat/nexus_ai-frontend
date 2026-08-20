"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DASHBOARD_BY_ROLE, type UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  role: UserRole;
  children: React.ReactNode;
}

const phoneVerificationRequired =
  process.env.NEXT_PUBLIC_PHONE_VERIFICATION_REQUIRED !== undefined
    ? process.env.NEXT_PUBLIC_PHONE_VERIFICATION_REQUIRED === "true"
    : process.env.NODE_ENV === "production";

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (!user.isEmailVerified) {
      router.replace("/email-not-verified");
    } else if (phoneVerificationRequired && !user.isPhoneVerified) {
      router.replace("/phone-not-verified");
    } else if (user.role !== role) {
      router.replace(DASHBOARD_BY_ROLE[user.role as UserRole]);
    }
  }, [loading, user, role, router]);

  if (
    loading ||
    !user ||
    !user.isEmailVerified ||
    (phoneVerificationRequired && !user.isPhoneVerified) ||
    user.role !== role
  ) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center text-sm text-on-surface-variant">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
