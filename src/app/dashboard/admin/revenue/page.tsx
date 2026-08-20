"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAdminRevenue } from "@/services/admin";
import { formatDate } from "@/utils/format";

type Revenue = Awaited<ReturnType<typeof getAdminRevenue>>;

export default function AdminRevenuePage() {
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getAdminRevenue()
      .then(setRevenue)
      .finally(() => setLoading(false));
  }, []);
  return (
    <DashboardShell
      role="admin"
      title="Nexus revenue"
      subtitle="Posted platform fees and deadline deductions from the escrow ledger."
    >
      {loading ? (
        <div className="flex justify-center py-20 text-on-surface-variant">
          <Loader2 className="mr-2 animate-spin" /> Loading revenue…
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(revenue?.byCurrency ?? {}).map(
              ([currency, totals]) => (
                <div
                  key={currency}
                  className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                    {currency}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-on-surface">
                    {totals.grossRevenue.toLocaleString()}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-on-surface-variant">
                    <p>Platform fees: {totals.platformFees.toLocaleString()}</p>
                    <p>
                      Deadline deductions:{" "}
                      {totals.deadlinePenalties.toLocaleString()}
                    </p>
                    <p>{totals.entries} posted entries</p>
                  </div>
                </div>
              ),
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="bg-surface-container-low text-on-surface-variant">
                  <tr>
                    <th className="p-4">Project</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {(revenue?.recentEntries ?? []).map((entry) => (
                    <tr key={entry.id}>
                      <td className="p-4 font-medium">
                        {entry.project?.title ?? entry.project?.id ?? "—"}
                      </td>
                      <td className="p-4 capitalize">
                        {entry.entryType.replace(/_/g, " ")}
                      </td>
                      <td className="p-4 font-semibold">
                        {Number(entry.amount).toLocaleString()} {entry.currency}
                      </td>
                      <td className="p-4 max-w-md truncate">
                        {entry.reason ?? "—"}
                      </td>
                      <td className="p-4">
                        {entry.postedAt ? formatDate(entry.postedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!revenue?.recentEntries.length && (
              <p className="p-8 text-center text-on-surface-variant">
                No platform revenue has posted yet.
              </p>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
