"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAdminProjectPlans } from "@/services/admin";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

export default function AdminProjectPlansQueue() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminProjectPlans()
      .then((res) => setPlans(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="admin" title="Project Plans" subtitle="Review AI-generated scrum master milestones and tasks.">
      {loading ? <p>Loading...</p> : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-low text-on-surface-variant font-medium">
                <tr>
                  <th className="p-4">Project</th>
                  <th className="p-4">Version</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Milestones / Tasks</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low/50">
                    <td className="p-4 font-semibold">{p.projectTitle || p.projectId}</td>
                    <td className="p-4">v{p.version}</td>
                    <td className="p-4"><StatusBadge status={p.status} /></td>
                    <td className="p-4">{p.milestoneCount || 0} / {p.taskCount || 0}</td>
                    <td className="p-4 text-right">
                      <Link href={`/dashboard/admin/project-plans/${p.id}`}>
                        <Button variant="outline" size="sm">Review</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {plans.length === 0 && <p className="p-6 text-center text-on-surface-variant">No project plans found.</p>}
        </div>
      )}
    </DashboardShell>
  );
}
