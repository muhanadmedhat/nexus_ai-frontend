"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Loader2,
  RefreshCcw,
  Search,
  Siren,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  getAutomationIncidentSummary,
  listAutomationIncidents,
  type AutomationIncident,
  type AutomationIncidentSummary,
} from "@/services/automation-incidents";

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "critical" | "good";
}) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow">
      <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <p
        className={`mt-2 font-headline text-2xl font-semibold ${
          tone === "critical"
            ? "text-error"
            : tone === "good"
              ? "text-primary-container"
              : "text-on-surface"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Trend({ summary }: { summary: AutomationIncidentSummary }) {
  const max = Math.max(1, ...summary.daily.map((entry) => entry.count));
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg font-semibold text-on-surface">
            Incident activity
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Occurrences over the last {summary.windowDays} days, including repeated failures.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant">
          {Object.entries(summary.bySubsystem).map(([name, count]) => (
            <span key={name} className="rounded-full bg-surface-container px-2.5 py-1">
              {name.replaceAll("_", " ")} {count}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5 flex h-28 items-end gap-2" aria-label="Incident trend">
        {summary.daily.map((entry) => (
          <div key={entry.date} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
            <span className="text-center text-[10px] text-on-surface-variant">
              {entry.count || ""}
            </span>
            <div
              title={`${entry.date}: ${entry.count} occurrence(s)`}
              className="min-h-1 rounded-t bg-primary-container/70"
              style={{ height: `${Math.max(4, (entry.count / max) * 80)}px` }}
            />
            <span className="truncate text-center text-[9px] text-on-surface-variant">
              {entry.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
      {summary.byErrorCode.length ? (
        <div className="mt-5 border-t border-outline-variant/30 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Most frequent error codes
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.byErrorCode.slice(0, 5).map((entry) => (
              <span
                key={entry.errorCode}
                className="rounded-lg bg-surface-container px-3 py-1.5 font-mono text-xs text-on-surface"
              >
                {entry.errorCode} · {entry.count}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function AutomationIncidentsPage() {
  const [incidents, setIncidents] = useState<AutomationIncident[]>([]);
  const [summary, setSummary] = useState<AutomationIncidentSummary | null>(null);
  const [status, setStatus] = useState("open");
  const [subsystem, setSubsystem] = useState("");
  const [severity, setSeverity] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const [result, analytics] = await Promise.all([
          listAutomationIncidents({
            status: status || undefined,
            subsystem: subsystem || undefined,
            severity: severity || undefined,
            search: query || undefined,
          }),
          getAutomationIncidentSummary(7),
        ]);
        setIncidents(result.incidents);
        setSummary(analytics);
        setError(null);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Could not load incidents",
        );
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [query, severity, status, subsystem],
  );

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <DashboardShell
      role="admin"
      title="Automation observability"
      subtitle="Trace failures from notification to root evidence, recovery guidance, and resolution history."
    >
      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Metric label="Open" value={summary.totalOpen} />
            <Metric label="Critical" value={summary.criticalOpen} tone="critical" />
            <Metric label="Recurring" value={summary.recurringOpen} />
            <Metric label="7-day occurrences" value={summary.occurredInWindow} />
            <Metric label="Projects affected" value={summary.impactedProjects} />
            <Metric
              label="Average resolution"
              value={
                summary.averageResolutionMinutes === null
                  ? "—"
                  : `${summary.averageResolutionMinutes}m`
              }
              tone="good"
            />
          </div>
          <div className="mt-5">
            <Trend summary={summary} />
          </div>
        </>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(search.trim());
        }}
        className="my-5 flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4"
      >
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
          Severity
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className="mt-1 block rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
          >
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
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
            <option value="delivery">Delivery</option>
            <option value="payouts">Payouts</option>
            <option value="ai_jobs">AI jobs</option>
            <option value="requirements_documents">Requirements documents</option>
          </select>
        </label>
        <label className="min-w-56 flex-1 text-sm text-on-surface-variant">
          Search code, operation, or message
          <span className="mt-1 flex rounded-lg border border-outline-variant bg-surface-container-lowest">
            <Search className="ml-3 mt-2.5 text-on-surface-variant" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-on-surface outline-none"
              placeholder="provisioning_failed"
            />
          </span>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface"
        >
          <RefreshCcw size={15} /> Refresh
        </button>
      </form>

      {loading ? (
        <p className="flex items-center gap-2 text-on-surface-variant">
          <Loader2 className="animate-spin" size={18} /> Loading incidents…
        </p>
      ) : error ? (
        <p className="rounded-lg bg-error-container p-4 text-on-error-container">
          {error}
        </p>
      ) : incidents.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 text-on-surface-variant">
          <CheckCircle2 className="text-primary-container" /> No matching incidents.
        </p>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <article
              key={incident.id}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow"
            >
              <div className="flex flex-wrap items-center gap-2">
                {incident.severity === "critical" ? (
                  <Siren size={18} className="text-error" />
                ) : (
                  <AlertTriangle size={18} className="text-secondary" />
                )}
                <span className="font-semibold text-on-surface">
                  {incident.subsystem.replaceAll("_", " ")} · {incident.operation.replaceAll("_", " ")}
                </span>
                <span className="rounded-full bg-surface-container px-2 py-1 text-xs uppercase text-on-surface-variant">
                  {incident.status}
                </span>
                <span className="ml-auto text-xs text-on-surface-variant">
                  {incident.occurrenceCount} occurrence(s)
                </span>
              </div>
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-on-surface">
                {incident.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-on-surface-variant">
                <span className="font-mono">{incident.traceId}</span>
                <span>Code: {incident.errorCode}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={12} /> {new Date(incident.lastOccurredAt).toLocaleString()}
                </span>
                {incident.projectId ? (
                  <span className="inline-flex items-center gap-1">
                    <FolderKanban size={12} /> Project attached
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  className="rounded-lg bg-primary-container px-3 py-2 text-sm font-semibold text-on-primary"
                  href={`/dashboard/admin/automation-incidents/${incident.id}`}
                >
                  Open trace and recovery
                </Link>
                {incident.suggestedActions[0]?.href ? (
                  <Link
                    className="text-sm font-semibold text-primary-container hover:underline"
                    href={incident.suggestedActions[0].href}
                  >
                    {incident.suggestedActions[0].label}
                  </Link>
                ) : null}
              </div>
              {incident.resolutionNote ? (
                <p className="mt-3 text-xs text-primary-container">
                  {incident.resolutionNote}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
