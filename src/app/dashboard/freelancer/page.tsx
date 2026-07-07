"use client";

import { Briefcase, Clock, Star, DollarSign, AlertCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatsCard } from "@/components/ui/stats-card";
import { useAuth } from "@/hooks/use-auth";

export default function FreelancerDashboardPage() {
  const { user } = useAuth();

  const stats = {
    activeTasks: 0,
    pendingSubmissions: 0,
    avgScore: "—",
    estimatedEarnings: "$0.00",
  };

  return (
    <DashboardShell
      role="freelancer"
      title="Freelancer Dashboard"
      subtitle="Manage your profile, matched tasks, and submissions."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Active Tasks" value={stats.activeTasks} icon={<Briefcase size={20} />} />
        <StatsCard label="Pending Submissions" value={stats.pendingSubmissions} icon={<Clock size={20} />} />
        <StatsCard label="Avg Evaluation Score" value={stats.avgScore} icon={<Star size={20} />} />
        <StatsCard label="Estimated Earnings" value={stats.estimatedEarnings} icon={<DollarSign size={20} />} />
      </div>

      {/* Profile readiness */}
      <div className="mt-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-secondary-container/20 p-2.5">
            <AlertCircle size={20} className="text-secondary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-on-surface">Complete your profile</h4>
            <p className="text-sm text-on-surface-variant">
              Add your skills, portfolio, and availability to start getting matched.
            </p>
            <div className="mt-3 h-1.5 w-full max-w-xs rounded-full bg-surface-container-high">
              <div className="h-1.5 w-1/3 rounded-full bg-primary-container" />
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">33% complete</p>
          </div>
        </div>
      </div>

      {/* Empty tasks section */}
      <div className="mt-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
          <Briefcase size={32} className="text-outline" />
        </div>
        <h3 className="text-lg font-semibold text-on-surface">No assigned project work yet</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Complete your profile to get matched with relevant projects.
        </p>
      </div>
    </DashboardShell>
  );
}