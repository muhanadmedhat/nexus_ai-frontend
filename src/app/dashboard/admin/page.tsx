"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  return (
    <DashboardShell
      role="admin"
      title="Admin Dashboard"
      subtitle="Oversee users, projects, and platform activity."
    >
      <div className="card-shadow rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8">
        <p className="text-on-surface-variant">
          Welcome, {user?.firstName}. The admin workspace is ready.
        </p>
      </div>
    </DashboardShell>
  );
}
