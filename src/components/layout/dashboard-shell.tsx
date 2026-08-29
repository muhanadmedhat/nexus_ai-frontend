"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { UserRole } from "@/types/auth";

interface DashboardShellProps {
  role: UserRole;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, title, subtitle, children }: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute role={role}>
      <div className="flex min-h-screen min-w-0 bg-background">
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            title={title}
            subtitle={subtitle}
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />
          <main
            data-dashboard-role={role}
            className="min-w-0 max-w-full flex-1 overflow-x-clip p-3 sm:p-4 md:p-6"
          >
            <div className="mx-auto w-full min-w-0 max-w-[1480px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
