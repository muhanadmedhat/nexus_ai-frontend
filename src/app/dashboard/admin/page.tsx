"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatsCard } from "@/components/ui/stats-card";
import { getAdminStats, type AdminStats } from "@/services/admin";
import {
  Users,
  User,
  UserCheck,
  FolderOpen,
  FileCheck,
  Clock,
  Award,
  Activity,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  brief_complete: "Brief Complete",
  assigned: "Assigned",
  active: "Active",
  completed: "Completed",
  profile_incomplete: "Profile Incomplete",
  cv_pending: "CV Pending",
  assessment_pending: "Assessment Pending",
  assessment_in_progress: "In Progress",
  assessment_submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  in_progress: "In Progress",
  submitted: "Submitted",
  passed: "Passed",
  failed: "Failed",
  needs_review: "Needs Review",
};

function StatusBreakdown({ items, label }: { items: Record<string, number>; label: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow">
      <h4 className="mb-3 text-sm font-semibold text-on-surface">{label}</h4>
      <div className="space-y-2">
        {Object.entries(items).map(([key, count]) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">{statusLabels[key] || key}</span>
            <span className="font-medium text-on-surface">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardShell role="admin" title="Admin Dashboard" subtitle="Loading platform data…">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-container border-t-transparent" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !stats) {
    return (
      <DashboardShell role="admin" title="Admin Dashboard" subtitle="Error loading data">
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center">
          <p className="text-error">{error || "Could not load stats"}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-primary-container px-4 py-2 text-on-primary"
          >
            Retry
          </button>
        </div>
      </DashboardShell>
    );
  }

  const { users, projects, freelancers, assessments, agents } = stats;

  return (
    <DashboardShell
      role="admin"
      title="Admin Dashboard"
      subtitle="Oversee users, projects, freelancers, assessments, and agent health."
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Users" value={users.total} icon={<Users size={20} />} />
        <StatsCard label="Customers" value={users.customers} icon={<User size={20} />} />
        <StatsCard label="Freelancers" value={users.freelancers} icon={<UserCheck size={20} />} />
        <StatsCard label="Total Projects" value={projects.total} icon={<FolderOpen size={20} />} />
        <StatsCard label="Brief Complete" value={projects.briefComplete} icon={<FileCheck size={20} />} />
        <StatsCard label="Active Projects" value={projects.active} icon={<Activity size={20} />} />
        <StatsCard label="Assessments Submitted" value={assessments.submitted} icon={<Award size={20} />} />
        <StatsCard label="Approved Freelancers" value={freelancers.approved} icon={<UserCheck size={20} />} />
      </div>

      {/* Breakdowns */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatusBreakdown
          items={{
            draft: projects.draft,
            brief_complete: projects.briefComplete,
            assigned: projects.assigned,
            active: projects.active,
            completed: projects.completed,
          }}
          label="Projects by Status"
        />

        <StatusBreakdown
          items={{
            profile_incomplete: freelancers.profileIncomplete,
            cv_pending: freelancers.cvPending,
            assessment_pending: freelancers.assessmentPending,
            assessment_in_progress: freelancers.assessmentInProgress,
            assessment_submitted: freelancers.assessmentSubmitted,
            approved: freelancers.approved,
            rejected: freelancers.rejected,
          }}
          label="Freelancers by Verification"
        />

        <StatusBreakdown
          items={{
            in_progress: assessments.inProgress,
            submitted: assessments.submitted,
            passed: assessments.passed,
            failed: assessments.failed,
            needs_review: assessments.needsReview,
          }}
          label="Assessments by Status"
        />
      </div>

      {/* Agents Overview */}
      <div className="mt-8 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
        <h3 className="mb-4 font-headline text-lg font-semibold text-on-surface">Agent Health</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg bg-surface-container-low p-3 text-center">
            <div className="text-sm text-on-surface-variant">Queued</div>
            <div className="text-2xl font-bold text-on-surface">{agents.queued}</div>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3 text-center">
            <div className="text-sm text-on-surface-variant">Running</div>
            <div className="text-2xl font-bold text-on-surface">{agents.running}</div>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3 text-center">
            <div className="text-sm text-on-surface-variant">Completed Today</div>
            <div className="text-2xl font-bold text-primary-container">{agents.completedToday}</div>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3 text-center">
            <div className="text-sm text-on-surface-variant">Failed Today</div>
            <div className="text-2xl font-bold text-error">{agents.failedToday}</div>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3 text-center">
            <div className="text-sm text-on-surface-variant">Healthy</div>
            <div className="text-2xl font-bold text-primary-container">{agents.healthy}</div>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3 text-center">
            <div className="text-sm text-on-surface-variant">Failing</div>
            <div className="text-2xl font-bold text-error">{agents.failing}</div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}