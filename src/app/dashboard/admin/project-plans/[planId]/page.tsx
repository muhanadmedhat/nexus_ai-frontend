"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getProjectPlanDetail } from "@/services/planning";
import { StatusBadge } from "@/components/ui/status-badge";

export default function AdminProjectPlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!planId) return;
    getProjectPlanDetail(planId)
      .then(setPlan)
      .finally(() => setLoading(false));
  }, [planId]);

  return (
    <DashboardShell role="admin" title="Materialize Project Plan" subtitle="Review AI-generated scrum master plans before storing.">
      <Link href="/dashboard/admin/project-plans" className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary">
        <ArrowLeft size={16} /> Back to queue
      </Link>
      
      {loading ? <p>Loading...</p> : !plan ? <p>Plan not found.</p> : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow space-y-4">
          <div className="flex items-start justify-between">
            <h3 className="font-headline text-lg font-semibold text-on-surface">Plan Overview (v{plan.version})</h3>
            <StatusBadge status={plan.status} />
          </div>
          <p className="text-sm">{plan.summary}</p>
          
          <div className="mt-6">
            <h4 className="font-semibold text-sm mb-2">Generated Milestones</h4>
            <div className="grid gap-2">
              {plan.milestones?.map((m: any, i: number) => (
                <div key={i} className="text-xs p-3 rounded border bg-surface-container-low flex justify-between">
                  <span><strong className="text-primary">{m.clientKey || "M"}</strong>: {m.title}</span>
                  <span>{m.budgetAmount} {m.currency}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-4 border rounded text-xs bg-surface-container font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
            {JSON.stringify(plan, null, 2)}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
