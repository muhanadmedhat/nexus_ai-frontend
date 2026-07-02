"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";

export default function FreelancerDashboardPage() {
  const { user } = useAuth();
  return (
    <DashboardShell
      role="freelancer"
      title="Freelancer Dashboard"
      subtitle="Manage your profile, matched tasks, and submissions."
    >
      <div className="card-shadow rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8">
        <p className="text-on-surface-variant">
          Welcome, {user?.firstName}. Your freelancer workspace is ready.
        </p>
      </div>
    </DashboardShell>
  );
}
