"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/common/logo";
import { ProtectedRoute } from "@/components/layout/protected-route";
import type { UserRole } from "@/types/auth";

interface DashboardShellProps {
  role: UserRole;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, title, subtitle, children }: DashboardShellProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <ProtectedRoute role={role}>
      <div className="flex min-h-screen flex-1 flex-col bg-background">
        <header className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-lowest px-6 py-4 md:px-10">
          <Logo className="text-2xl" />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-on-surface-variant sm:block">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-on-primary">
              {initials}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-10 md:px-10">
          <div className="mb-8">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-on-surface-variant">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
