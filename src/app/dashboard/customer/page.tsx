"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  return (
    <DashboardShell
      role="customer"
      title="Customer Dashboard"
      subtitle="Track your active projects, AI agent progress, and escrow status."
    >
      <div className="card-shadow rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8">
        <p className="text-on-surface-variant">
          Welcome, {user?.firstName}. Your client workspace is ready.
        </p>
      </div>
    </DashboardShell>
  );
}
