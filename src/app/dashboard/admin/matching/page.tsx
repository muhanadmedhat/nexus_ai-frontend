"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAdminMatchingRuns } from "@/services/admin";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

export default function AdminMatchingQueue() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminMatchingRuns()
      .then((res) => setRuns(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="admin" title="Matching Queue" subtitle="Review AI matching candidates for planning roles.">
      {loading ? <p>Loading...</p> : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-low text-on-surface-variant font-medium">
                <tr>
                  <th className="p-4">Project</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Candidates</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low/50">
                    <td className="p-4 font-semibold">{r.projectTitle || r.projectId}</td>
                    <td className="p-4 uppercase text-xs font-semibold tracking-wider text-primary">{r.targetRoleKey?.replace("_", " ")}</td>
                    <td className="p-4"><StatusBadge status={r.status} /></td>
                    <td className="p-4">{r.candidateCount}</td>
                    <td className="p-4 text-right">
                      <Link href={`/dashboard/admin/matching/${r.id}`}>
                        <Button variant="outline">Review</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {runs.length === 0 && <p className="p-6 text-center text-on-surface-variant">No matching runs found.</p>}
        </div>
      )}
    </DashboardShell>
  );
}
