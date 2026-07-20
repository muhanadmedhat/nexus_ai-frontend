"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAdminStats, type AdminStats } from "@/services/admin";

const labels: Record<string, string> = {
  total: "Total",
  customers: "Customers",
  freelancers: "Freelancers",
  admins: "Admins",
  emailVerified: "Email Verified",
  emailPending: "Email Pending",
  draft: "Draft",
  inProgress: "In Progress",
  briefComplete: "Brief Complete",
  planningMatching: "Planning Matching",
  planningAssigned: "Planning Assigned",
  planningInProgress: "Planning In Progress",
  planningReview: "Planning Review",
  implementationReady: "Implementation Ready",
  matching: "Implementation Matching",
  matched: "Matched",
  specInProgress: "Spec In Progress",
  specUnderReview: "Spec Under Review",
  specComplete: "Spec Complete",
  scoped: "Scoped",
  assigned: "Assigned",
  active: "Active",
  underReview: "Under Review",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
  profileIncomplete: "Profile Incomplete",
  cvPending: "CV Pending",
  cvProcessing: "CV Processing",
  cvExtractionFailed: "CV Failed",
  assessmentPending: "Assessment Pending",
  assessmentGenerationFailed: "Assessment Failed",
  assessmentInProgress: "Assessment In Progress",
  assessmentSubmitted: "Assessment Submitted",
  interviewPending: "Interview Pending",
  approved: "Approved",
  rejected: "Rejected",
  submitted: "Submitted",
  passed: "Passed",
  failed: "Failed",
  needsReview: "Needs Review",
  queued: "Queued",
  running: "Running",
  completedToday: "Completed Today",
  failedToday: "Failed Today",
  healthy: "Healthy",
  failing: "Failing",
};

function StatSection({
  title,
  items,
}: {
  title: string;
  items: Record<string, number | Record<string, number> | undefined>;
}) {
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
      <h2 className="font-headline text-lg font-semibold text-on-surface">
        {title}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Object.entries(items)
          .filter(([, value]) => typeof value === "number")
          .map(([key, value]) => (
            <div
              key={key}
              className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-3"
            >
              <p className="text-xs text-on-surface-variant">
                {labels[key] ?? key}
              </p>
              <p className="mt-1 font-headline text-xl font-semibold text-on-surface">
                {value as number}
              </p>
            </div>
          ))}
      </div>
    </section>
  );
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      role="admin"
      title="Platform Stats"
      subtitle="Full operational breakdown for users, projects, freelancers, assessments, and agents."
    >
      <Link
        href="/dashboard/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary-container"
      >
        <ArrowLeft size={16} />
        Back to admin dashboard
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      ) : error || !stats ? (
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          {error || "Could not load stats"}
        </div>
      ) : (
        <div className="space-y-5">
          <StatSection title="Users" items={stats.users} />
          <StatSection title="Projects" items={stats.projects} />
          <StatSection title="Freelancers" items={stats.freelancers} />
          <StatSection title="Assessments" items={stats.assessments} />
          <StatSection title="Agents" items={stats.agents} />
        </div>
      )}
    </DashboardShell>
  );
}
