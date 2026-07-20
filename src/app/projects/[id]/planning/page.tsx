"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import { getProjectPlans, type ProjectPlan } from "@/services/planning";
import { StatusBadge } from "@/components/ui/status-badge";

type ProjectPlanListItem = ProjectPlan & { milestoneCount?: number; taskCount?: number };

export default function PlanningPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [plans, setPlans] = useState<ProjectPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || user?.role !== "customer") return;
    getProjectPlans(id)
      .then((items) => setPlans(items as ProjectPlanListItem[]))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [id, user?.role]);

  return (
    <DashboardShell role="customer" title="Project Planning" subtitle="Track deliverables and sprint milestones.">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to project
      </Link>
      
      {loading ? (
        <p className="text-sm">Loading...</p>
      ) : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
          <div className="mb-6 flex items-center gap-2 border-b border-outline-variant/20 pb-4">
            <CalendarClock className="text-primary" size={24} />
            <h3 className="font-headline text-lg font-semibold text-on-surface">Scrum Plans</h3>
          </div>

          {plans.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Planning phases will appear here once approved by an admin.</p>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.id} className={`rounded-lg border p-4 ${plan.isCurrent ? 'border-primary/50' : 'border-outline-variant/30 opacity-75'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-on-surface">Plan Revision {plan.version} {plan.isCurrent && "(Current)"}</h4>
                      <p className="mt-1 text-sm text-on-surface-variant">{plan.summary || "No summary provided."}</p>
                    </div>
                    <StatusBadge status={plan.status} />
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-on-surface-variant">
                    <span className="rounded-full bg-surface-container px-3 py-1">
                      {plan.milestoneCount || 0} Milestones
                    </span>
                    <span className="rounded-full bg-surface-container px-3 py-1">
                      {plan.taskCount || 0} Tasks
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
