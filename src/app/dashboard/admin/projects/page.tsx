"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Filter, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminProjects, type AdminProjectSummary } from "@/services/admin";
import { formatDate } from "@/utils/format";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProjectSummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [automationStatus, setAutomationStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminProjects({
        limit: 100,
        search: search || undefined,
        status: status || undefined,
        automationStatus: automationStatus || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setProjects(result.data);
    } finally {
      setLoading(false);
    }
  }, [automationStatus, dateFrom, dateTo, search, status]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  return (
    <DashboardShell
      role="admin"
      title="Projects"
      subtitle="Search operational state and intervene only when automation needs help."
    >
      <form
        className="mb-5 grid gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 md:grid-cols-2 xl:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Project or customer"
          className="rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm"
        />
        <input
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          placeholder="Project status"
          className="rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm"
        />
        <input
          value={automationStatus}
          onChange={(event) => setAutomationStatus(event.target.value)}
          placeholder="Automation status"
          className="rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm"
          aria-label="Created from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm"
          aria-label="Created to"
        />
        <Button type="submit">
          <Filter size={16} /> Apply filters
        </Button>
      </form>
      {loading ? (
        <div className="flex justify-center py-20 text-on-surface-variant">
          <Loader2 className="mr-2 animate-spin" /> Loading projects…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant">
                <tr>
                  <th className="p-4">Project</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Automation</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-surface-container-low/50"
                  >
                    <td className="p-4">
                      <Link
                        href={`/dashboard/admin/projects/${project.id}/delivery`}
                        className="font-semibold text-primary-container hover:underline"
                      >
                        {project.title}
                      </Link>
                    </td>
                    <td className="p-4">
                      <p>
                        {project.customer
                          ? `${project.customer.firstName ?? ""} ${project.customer.lastName ?? ""}`.trim()
                          : "—"}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {project.customer?.email}
                      </p>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="p-4">
                      <StatusBadge
                        status={project.automationStatus ?? "unknown"}
                      />
                    </td>
                    <td className="p-4">
                      {project.createdAt ? formatDate(project.createdAt) : "—"}
                    </td>
                    <td className="p-4">
                      {project.budgetMin ?? "—"}–{project.budgetMax ?? "—"}{" "}
                      {project.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {projects.length === 0 && (
            <p className="p-8 text-center text-on-surface-variant">
              No projects match these filters.
            </p>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
