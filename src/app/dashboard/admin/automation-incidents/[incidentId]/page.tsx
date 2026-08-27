"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  getAutomationIncident,
  resolveAutomationIncident,
  type AutomationIncident,
  type AutomationIncidentEvent,
} from "@/services/automation-incidents";

function JsonBlock({ value }: { value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) {
    return <p className="text-sm text-on-surface-variant">No structured context was captured.</p>;
  }
  return (
    <pre className="max-h-96 overflow-auto rounded-lg bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function EventCard({ event }: { event: AutomationIncidentEvent }) {
  return (
    <article className="relative border-l-2 border-outline-variant pl-5 pb-7 last:pb-0">
      <span
        className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ${
          event.eventType === "resolved"
            ? "bg-primary-container"
            : event.severity === "critical"
              ? "bg-error"
              : "bg-secondary"
        }`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold capitalize text-on-surface">
          {event.eventType}
        </span>
        <span className="font-mono text-xs text-on-surface-variant">{event.traceId}</span>
        <time className="ml-auto text-xs text-on-surface-variant">
          {new Date(event.occurredAt).toLocaleString()}
        </time>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface">
        {event.message}
      </p>
      {event.trace ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-primary-container">
            Stack trace
          </summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
            {event.trace}
          </pre>
        </details>
      ) : null}
      {event.context && Object.keys(event.context).length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-primary-container">
            Occurrence context
          </summary>
          <div className="mt-2"><JsonBlock value={event.context} /></div>
        </details>
      ) : null}
    </article>
  );
}

export default function AutomationIncidentDetailPage() {
  const params = useParams<{ incidentId: string }>();
  const router = useRouter();
  const toast = useToast();
  const [incident, setIncident] = useState<AutomationIncident | null>(null);
  const [events, setEvents] = useState<AutomationIncidentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAutomationIncident(params.incidentId);
      setIncident(result.incident);
      setEvents(result.events);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load incident",
      );
    } finally {
      setLoading(false);
    }
  }, [params.incidentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const resolve = async () => {
    if (!incident || incident.status === "resolved") return;
    setResolving(true);
    try {
      await resolveAutomationIncident(incident.id, resolutionNote.trim() || undefined);
      toast.success("Incident resolved", "The resolution is recorded in the trace.");
      setResolutionNote("");
      await load();
    } catch (resolveError) {
      const message =
        resolveError instanceof Error ? resolveError.message : "Could not resolve incident";
      setError(message);
      toast.error("Resolution failed", message);
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell role="admin" title="Incident trace" subtitle="Loading evidence…">
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary-container" size={32} />
        </div>
      </DashboardShell>
    );
  }

  if (!incident) {
    return (
      <DashboardShell role="admin" title="Incident trace" subtitle="Incident unavailable">
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-error">
          {error ?? "Incident not found"}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role="admin"
      title={`${incident.subsystem.replaceAll("_", " ")} incident`}
      subtitle={`${incident.operation.replaceAll("_", " ")} · ${incident.traceId}`}
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/admin/automation-incidents")}
          className="!w-auto px-3 py-2 text-sm"
        >
          <ArrowLeft size={16} /> Back to incidents
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void load()}
          className="!w-auto px-3 py-2 text-sm"
        >
          <RefreshCw size={16} /> Refresh
        </Button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(incident.traceId);
            toast.success("Trace ID copied");
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface"
        >
          <Clipboard size={15} /> Copy {incident.traceId}
        </button>
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-error/30 bg-error-container/10 p-4 text-sm text-error">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
        <div className="flex flex-wrap items-center gap-2">
          {incident.status === "resolved" ? (
            <CheckCircle2 className="text-primary-container" size={20} />
          ) : (
            <AlertTriangle className="text-error" size={20} />
          )}
          <span className="font-headline text-lg font-semibold capitalize text-on-surface">
            {incident.status}
          </span>
          <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs uppercase text-on-surface-variant">
            {incident.severity}
          </span>
          <span className="ml-auto text-sm text-on-surface-variant">
            {incident.occurrenceCount} occurrence(s)
          </span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-on-surface">
          {incident.message}
        </p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-on-surface-variant">Error code</dt>
            <dd className="mt-1 font-mono font-semibold text-on-surface">{incident.errorCode}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">First seen</dt>
            <dd className="mt-1 font-semibold text-on-surface">
              {new Date(incident.firstOccurredAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Last seen</dt>
            <dd className="mt-1 font-semibold text-on-surface">
              {new Date(incident.lastOccurredAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Affected project</dt>
            <dd className="mt-1 font-semibold text-on-surface">
              {incident.projectId ? (
                <Link
                  href={`/dashboard/admin/projects/${incident.projectId}/delivery`}
                  className="text-primary-container hover:underline"
                >
                  Open project
                </Link>
              ) : (
                "Platform-wide"
              )}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              Suggested recovery
            </h2>
            <div className="mt-4 space-y-3">
              {incident.suggestedActions.map((action, index) => (
                <div key={action.key} className="rounded-lg bg-surface-container-low p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-on-surface">{action.label}</p>
                      <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                        {action.description}
                      </p>
                      {action.href ? (
                        <Link
                          href={action.href}
                          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary-container hover:underline"
                        >
                          Open workspace <ExternalLink size={13} />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              Latest structured context
            </h2>
            <div className="mt-4"><JsonBlock value={incident.context} /></div>
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              Resolution
            </h2>
            {incident.status === "resolved" ? (
              <div className="mt-3 rounded-lg bg-primary-container/10 p-4 text-sm text-on-surface">
                <p>{incident.resolutionNote ?? "Resolved"}</p>
                {incident.resolvedAt ? (
                  <p className="mt-2 text-xs text-on-surface-variant">
                    {new Date(incident.resolvedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Successful automation resolves this automatically. If you handled the cause outside Nexus AI, record what changed before closing it.
                </p>
                <textarea
                  value={resolutionNote}
                  onChange={(event) => setResolutionNote(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Example: corrected the GitHub App permissions and confirmed repository provisioning."
                  className="mt-4 w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface outline-none focus:border-primary-container"
                />
                <Button
                  type="button"
                  loading={resolving}
                  onClick={() => void resolve()}
                  className="mt-3 !w-auto px-4 py-2 text-sm"
                >
                  Mark resolved
                </Button>
              </>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
          <h2 className="font-headline text-lg font-semibold text-on-surface">
            Occurrence timeline
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Up to the latest 100 occurrences, reopens, and resolutions. Secrets are redacted before storage.
          </p>
          <div className="mt-6">
            {events.length ? (
              events.map((event) => <EventCard key={event.id} event={event} />)
            ) : (
              <p className="text-sm text-on-surface-variant">
                This incident predates occurrence tracing. New occurrences will appear here.
              </p>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
