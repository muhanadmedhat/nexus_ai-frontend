"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAdminPlanningSubmissions } from "@/services/admin";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import type { PlanningSubmission } from "@/services/planning";

type AdminPlanningSubmission = PlanningSubmission & { projectTitle?: string | null; freelancerName?: string | null };

export default function AdminPlanningSubmissionsQueue() {
  const [submissions, setSubmissions] = useState<AdminPlanningSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminPlanningSubmissions()
      .then((res) => setSubmissions(Array.isArray(res.data) ? (res.data as unknown as AdminPlanningSubmission[]) : []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="admin" title="Planning Submissions" subtitle="Review architecture and UI/UX deliverables.">
      {loading ? <p>Loading...</p> : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
          <div className="admin-responsive-table-wrap">
            <table className="admin-responsive-table text-left text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant font-medium">
                <tr>
                  <th className="p-4">Project</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Freelancer</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">AI gate</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low/50">
                    <td data-label="Project" className="p-4 font-semibold">{s.projectTitle || s.projectId}</td>
                    <td data-label="Type" className="p-4 uppercase text-xs tracking-wider">{s.submissionType?.replace("_", " ")} v{s.version}</td>
                    <td data-label="Freelancer" className="p-4">{s.freelancerName || "N/A"}</td>
                    <td data-label="Status" className="p-4"><StatusBadge status={s.status} /></td>
                    <td data-label="AI gate" className="p-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={s.evaluationStatus || "pending"} />
                        {s.evaluationScore !== null && s.evaluationScore !== undefined ? <span className="text-xs text-on-surface-variant">{s.evaluationScore}/100</span> : null}
                      </div>
                    </td>
                    <td data-label="Action" className="p-4 text-right">
                      <Link href={`/dashboard/admin/planning/submissions/${s.id}`}>
                        <Button variant="outline" size="sm">Review</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {submissions.length === 0 && <p className="p-6 text-center text-on-surface-variant">No submissions found.</p>}
        </div>
      )}
    </DashboardShell>
  );
}
