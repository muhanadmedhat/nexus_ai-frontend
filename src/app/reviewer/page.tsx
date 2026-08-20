"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { getReviewerProjects, type ReviewerProject } from "@/services/reviewer";

export default function ReviewerProjectsPage() {
  const [projects, setProjects] = useState<ReviewerProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReviewerProjects()
      .then(setProjects)
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Could not load projects",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      role="freelancer"
      title="Principal reviewer"
      subtitle="Manage AI-assisted delivery for your assigned projects."
    >
      {loading ? (
        <div className="flex justify-center py-20 text-on-surface-variant">
          <Loader2 className="mr-2 animate-spin" /> Loading projects…
        </div>
      ) : error ? (
        <p className="rounded-xl bg-error-container/10 p-4 text-error">
          {error}
        </p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant p-12 text-center">
          <ShieldCheck className="mx-auto mb-3 text-outline" size={36} />
          <h2 className="font-semibold text-on-surface">
            No reviewer assignments
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            When you accept a principal-reviewer invitation, its project appears
            here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((item) => (
            <Link
              key={item.assignmentId}
              href={`/reviewer/projects/${item.project.id}`}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow transition hover:border-primary-container/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                    Principal reviewer
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-on-surface">
                    {item.project.title}
                  </h2>
                </div>
                <StatusBadge status={item.project.status} />
              </div>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  {item.budgetAmount
                    ? `${Number(item.budgetAmount).toLocaleString()} ${item.currency}`
                    : "Compensation allocated"}
                </span>
                <span className="flex items-center gap-1 font-medium text-primary-container">
                  Open workbench <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
