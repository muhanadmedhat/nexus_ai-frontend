"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAdminStats, type AdminStats } from "@/services/admin";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  CreditCard,
  FileCheck,
  FolderKanban,
  ListChecks,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

function AgentMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "good" | "bad";
}) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
      <p className="text-xs font-medium text-on-surface-variant">{label}</p>
      <p
        className={
          tone === "good"
            ? "mt-1 font-headline text-2xl font-semibold text-primary-container"
            : tone === "bad"
              ? "mt-1 font-headline text-2xl font-semibold text-error"
              : "mt-1 font-headline text-2xl font-semibold text-on-surface"
        }
      >
        {value}
      </p>
    </div>
  );
}

function WorkspaceButton({
  href,
  title,
  icon,
  metric,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  metric?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow transition hover:-translate-y-0.5 hover:border-primary-container/40 hover:bg-surface-container-low"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
          <h3 className="font-headline text-base font-semibold text-on-surface group-hover:text-primary-container">
            {title}
          </h3>
            {metric ? (
              <span className="shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                {metric}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
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
      <DashboardShell
        role="admin"
        title="Admin Dashboard"
        subtitle="Loading platform data..."
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !stats) {
    return (
      <DashboardShell
        role="admin"
        title="Admin Dashboard"
        subtitle="Error loading data"
      >
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
  const planningProjects =
    (projects.planningMatching ?? 0) +
    (projects.planningAssigned ?? 0) +
    (projects.planningInProgress ?? 0) +
    (projects.planningReview ?? 0);

  return (
    <DashboardShell
      role="admin"
      title="Admin Dashboard"
      subtitle="Monitor the platform and jump into the right operations queue."
    >
      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-container">
              <Cpu size={16} />
              Agent health
            </div>
          </div>
          <Link
            href="/dashboard/admin/agents"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
          >
            Open agents
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AgentMetric label="Queued" value={agents.queued} />
          <AgentMetric label="Running" value={agents.running} />
          <AgentMetric
            label="Completed today"
            value={agents.completedToday}
            tone="good"
          />
          <AgentMetric label="Failed today" value={agents.failedToday} tone="bad" />
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-xl font-semibold text-on-surface">
              Admin workspaces
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <WorkspaceButton
            href="/dashboard/admin/matching"
            title="Projects"
            icon={<FolderKanban size={20} />}
            metric={`${planningProjects} planning`}
          />
          <WorkspaceButton
            href="/dashboard/admin/freelancers"
            title="Freelancers"
            icon={<ShieldCheck size={20} />}
            metric={`${freelancers.assessmentSubmitted} waiting`}
          />
          <WorkspaceButton
            href="/dashboard/admin/assessments"
            title="Assessments"
            icon={<ClipboardCheck size={20} />}
            metric={`${assessments.submitted} submitted`}
          />
          <WorkspaceButton
            href="/dashboard/admin/project-plans"
            title="Scrum Plans"
            icon={<FileCheck size={20} />}
            metric={`${projects.implementationReady ?? 0} ready`}
          />
          <WorkspaceButton
            href="/dashboard/admin/payments"
            title="Escrow"
            icon={<CreditCard size={20} />}
            metric="Stripe"
          />
          <WorkspaceButton
            href="/dashboard/admin/users"
            title="Users"
            icon={<Users size={20} />}
            metric={`${users.total} users`}
          />
          <WorkspaceButton
            href="/dashboard/admin/agent-jobs"
            title="Agent Jobs"
            icon={<ListChecks size={20} />}
            metric={`${agents.queued} queued`}
          />
          <WorkspaceButton
            href="/dashboard/admin/stats"
            title="Stats"
            icon={<BarChart3 size={20} />}
            metric="Full"
          />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-container">
            <CheckCircle2 size={16} />
            Approved freelancers
          </div>
          <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
            {freelancers.approved}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Available for matching.
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-container">
            <Sparkles size={16} />
            Submitted assessments
          </div>
          <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
            {assessments.submitted}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Waiting for admin review.
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-container">
            <FolderKanban size={16} />
            Projects
          </div>
          <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
            {projects.total}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Across brief, planning, and implementation.
          </p>
        </div>
      </section>
    </DashboardShell>
  );
}
