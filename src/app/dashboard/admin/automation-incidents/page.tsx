"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCcw } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  listAutomationIncidents,
  type AutomationIncident,
} from "@/services/automation-incidents";

export default function AutomationIncidentsPage() {
  const [incidents, setIncidents] = useState<AutomationIncident[]>([]);
  const [status, setStatus] = useState("open");
  const [subsystem, setSubsystem] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const result = await listAutomationIncidents({
        status: status || undefined,
        subsystem: subsystem || undefined,
      });
      setIncidents(result.incidents);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load incidents");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [status, subsystem]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <DashboardShell
      role="admin"
      title="Automation incidents"
      subtitle="One operational view for matching, planning, repositories, payouts, and other background workflows."
    >
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
        <label className="text-sm text-on-surface-variant">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 block rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
          >
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="">All</option>
          </select>
        </label>
        <label className="text-sm text-on-surface-variant">
          Subsystem
          <select
            value={subsystem}
            onChange={(event) => setSubsystem(event.target.value)}
            className="mt-1 block rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
          >
            <option value="">All</option>
            <option value="matching">Matching</option>
            <option value="planning">Planning</option>
            <option value="repositories">Repositories</option>
            <option value="payouts">Payouts</option>
            <option value="ai_jobs">AI jobs</option>
            <option value="requirements_documents">Requirements documents</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface"
        >
          <RefreshCcw size={15} /> Refresh
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-on-surface-variant"><Loader2 className="animate-spin" size={18} /> Loading incidents…</p>
      ) : error ? (
        <p className="rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>
      ) : incidents.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 text-on-surface-variant">
          <CheckCircle2 className="text-primary-container" /> No matching incidents.
        </p>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <article key={incident.id} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle size={18} className={incident.severity === "critical" ? "text-error" : "text-secondary"} />
                <span className="font-semibold text-on-surface">{incident.subsystem} · {incident.operation}</span>
                <span className="rounded-full bg-surface-container px-2 py-1 text-xs uppercase text-on-surface-variant">{incident.status}</span>
                <span className="ml-auto text-xs text-on-surface-variant">{incident.occurrenceCount} occurrence(s)</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-on-surface">{incident.message}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-on-surface-variant">
                <span>Code: {incident.errorCode}</span>
                <span>Latest: {new Date(incident.lastOccurredAt).toLocaleString()}</span>
                {incident.projectId && (
                  <Link className="font-semibold text-primary-container hover:underline" href={`/dashboard/admin/projects/${incident.projectId}/delivery`}>
                    Open project
                  </Link>
                )}
              </div>
              {incident.resolutionNote && <p className="mt-2 text-xs text-primary-container">{incident.resolutionNote}</p>}
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
