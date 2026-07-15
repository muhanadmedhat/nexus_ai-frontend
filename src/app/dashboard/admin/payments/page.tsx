"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAdminPayments } from "@/services/admin";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/utils/format";

export default function AdminPaymentsQueue() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminPayments()
      .then((res) => setPayments(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="admin" title="Payments & Escrow" subtitle="Overview of project escrows, milestone releases, and funding tasks.">
      {loading ? <p>Loading...</p> : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-low text-on-surface-variant font-medium">
                <tr>
                  <th className="p-4">Project</th>
                  <th className="p-4">Purpose</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low/50">
                    <td className="p-4 font-semibold">{p.projectTitle || p.projectId}</td>
                    <td className="p-4 uppercase text-xs tracking-wider text-primary">{p.purpose?.replace(/_/g, " ")}</td>
                    <td className="p-4 font-medium">{p.amount} {p.currency}</td>
                    <td className="p-4">{p.createdAt ? formatDate(p.createdAt) : "—"}</td>
                    <td className="p-4"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {payments.length === 0 && <p className="p-6 text-center text-on-surface-variant">No related payments found.</p>}
        </div>
      )}
    </DashboardShell>
  );
}
