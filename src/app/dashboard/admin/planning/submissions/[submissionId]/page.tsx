"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BrainCircuit, CheckCircle2, MessageSquareWarning, RotateCcw, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  getSubmissionDetail,
  retryPlanningEvaluation,
  reviewSubmission,
  type PlanningRequirementEvidence,
  type PlanningSubmission,
} from "@/services/planning";

function safeArtifactUrl(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export default function AdminSubmissionDetail() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const toast = useToast();
  const [detail, setDetail] = useState<PlanningSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!submissionId) return Promise.resolve();
    return getSubmissionDetail(submissionId)
      .then((submission) => {
        setDetail(submission);
        setNotes(submission.adminNotes || "");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Could not load submission";
        toast.error("Could not load submission", message);
      })
      .finally(() => setLoading(false));
  }, [submissionId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!submissionId || !detail || !["queued", "running"].includes(detail.evaluationStatus ?? "")) return;
    const interval = window.setInterval(() => {
      void getSubmissionDetail(submissionId).then(setDetail).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [detail, submissionId]);

  async function retryEvaluation() {
    if (!submissionId) return;
    setActionLoading("retry");
    try {
      await retryPlanningEvaluation(submissionId);
      toast.success("Evaluation queued", "The AI quality gate will retry this submission.");
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not retry evaluation";
      toast.error("Retry failed", message);
    } finally {
      setActionLoading(null);
    }
  }

  async function decide(status: "approved" | "changes_requested" | "rejected") {
    if (!submissionId) return;
    setActionLoading(status);
    try {
      const result = await reviewSubmission(submissionId, {
        status,
        adminNotes: notes.trim() || undefined,
      });

      if (status === "approved" && result?.planGenerationJob?.queued) {
        toast.success("Scrum plan generation queued", "Both planning deliverables are approved, so the scrum master agent is working now.");
      } else if (status === "approved" && result?.planGenerationJob?.reason === "plan_already_exists") {
        toast.success("Submission approved", "A scrum plan already exists for this architecture and UI/UX pair.");
      } else {
        toast.success("Submission reviewed", `Marked as ${status.replace("_", " ")}.`);
      }

      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not review submission";
      toast.error("Review failed", message);
    } finally {
      setActionLoading(null);
    }
  }

  const canApprove = detail?.evaluationStatus === "completed" &&
    detail.evaluationRecommendation === "approve" && detail.status === "submitted";
  const evidenceEntries = Object.entries(
    (detail?.content?.requirementEvidence ?? {}) as Record<string, PlanningRequirementEvidence>
  );
  const inspectedArtifacts = detail?.evaluationResult?.artifactManifest?.artifacts ?? [];
  const artifactById = new Map(inspectedArtifacts.map((artifact) => [artifact.id, artifact]));

  return (
    <DashboardShell role="admin" title="Planning Submission Details" subtitle="Approve architecture and UI/UX deliverables.">
      <Link href="/dashboard/admin/planning/submissions" className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary">
        <ArrowLeft size={16} /> Back to queue
      </Link>

      {loading ? <p>Loading...</p> : !detail ? <p>Submission not found.</p> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <div className="flex flex-col gap-3 border-b border-outline-variant/20 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{detail.submissionType?.replace("_", " ")} v{detail.version}</p>
                <h3 className="mt-2 font-headline text-xl font-semibold text-on-surface">{detail.title || "Planning deliverable"}</h3>
                <p className="mt-1 text-sm text-on-surface-variant">{detail.freelancer?.name || "Assigned freelancer"}</p>
              </div>
              <StatusBadge status={detail.status} />
            </div>

            <section className="mt-5">
              <h4 className="font-semibold text-on-surface">Summary</h4>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{detail.summary || "No summary provided."}</p>
            </section>

            <section className="mt-5">
              <h4 className="font-semibold text-on-surface">Submitted content</h4>
              <div className="mt-2 space-y-3">
                {evidenceEntries.length ? evidenceEntries.map(([key, evidence]) => (
                  <article key={key} className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
                    <h5 className="text-sm font-semibold capitalize text-on-surface">{key.replaceAll("_", " ")}</h5>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">{evidence.summary}</p>
                    {evidence.urls?.length ? (
                      <ul className="mt-2 space-y-1">
                        {evidence.urls.map((url) => (
                          <li key={url}><a href={url} target="_blank" rel="noreferrer" className="break-all text-xs text-primary underline">{url}</a></li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                )) : (
                  <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 text-xs leading-5 text-on-surface">
                    <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(detail.content || {}, null, 2)}</pre>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6 border-t border-outline-variant/30 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={19} className="text-primary" />
                  <h4 className="font-semibold text-on-surface">AI quality evaluation</h4>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={detail.evaluationStatus || "pending"} />
                  {detail.evaluationScore !== null && detail.evaluationScore !== undefined ? (
                    <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold">{detail.evaluationScore}/100</span>
                  ) : null}
                </div>
              </div>
              {detail.evaluationStatus === "pending_architecture" ? (
                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-on-surface">Evaluation is waiting for architecture approval. It will queue automatically after that decision.</p>
              ) : null}
              {detail.evaluationError ? (
                <div className="mt-3 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
                  <p>{detail.evaluationError}</p>
                  {detail.evaluationStatus === "failed" ? <Button type="button" variant="outline" size="sm" className="mt-3" loading={actionLoading === "retry"} onClick={retryEvaluation}><RotateCcw size={14} /> Retry evaluation</Button> : null}
                </div>
              ) : null}
              {detail.evaluationResult ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg bg-surface-container-low p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recommendation: {detail.evaluationResult.recommendation.replace("_", " ")}</p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">{detail.evaluationResult.summary}</p>
                    <p className="mt-2 text-xs text-on-surface-variant">
                      {detail.evaluationResult.reused ? "Identical artifact snapshot — previous verdict reused." : `Evaluated by ${detail.evaluationResult.modelName || "the configured model"}`} · prompt {detail.evaluationResult.promptVersion || "legacy"}
                    </p>
                  </div>
                  {inspectedArtifacts.length ? (
                    <div>
                      <h5 className="text-sm font-semibold text-on-surface">Artifact snapshot</h5>
                      <div className="mt-2 space-y-2">
                        {inspectedArtifacts.map((artifact) => {
                          const artifactUrl = safeArtifactUrl(artifact.sourceUrl);
                          return (
                            <article key={artifact.id} className="rounded-lg border border-outline-variant/30 p-3 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                {artifactUrl ? <a href={artifactUrl} target="_blank" rel="noreferrer" className="break-all font-medium text-primary underline">{artifact.location || artifactUrl}</a> : <span className="font-medium">{artifact.location || artifact.id}</span>}
                                <StatusBadge status={artifact.status} />
                              </div>
                              <p className="mt-1 text-on-surface-variant">{artifact.mimeType || "Unknown type"} · {Math.ceil((artifact.sizeBytes || 0) / 1024)} KB{artifact.version ? ` · version ${artifact.version}` : ""}</p>
                              {artifact.sha256 ? <p className="mt-1 font-mono text-[11px] text-on-surface-variant">SHA-256 {artifact.sha256}</p> : null}
                              {artifact.error ? <p className="mt-1 text-error">{artifact.error}</p> : null}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {detail.evaluationResult.regressions?.length ? (
                    <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
                      Regressed requirements: {detail.evaluationResult.regressions.join(", ")}
                    </div>
                  ) : null}
                  {detail.evaluationResult.revisionItems.length ? (
                    <div>
                      <h5 className="text-sm font-semibold text-on-surface">Required revisions</h5>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
                        {detail.evaluationResult.revisionItems.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    {detail.evaluationResult.checks.map((check) => (
                      <article key={check.key} className="rounded-lg border border-outline-variant/30 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h5 className="text-sm font-semibold text-on-surface">{check.title}</h5>
                          <StatusBadge status={check.status} />
                        </div>
                        <p className="mt-2 text-xs leading-5 text-on-surface-variant">{check.feedback}</p>
                        {check.citations?.length ? (
                          <ul className="mt-2 space-y-1 border-t border-outline-variant/20 pt-2 text-xs text-on-surface-variant">
                            {check.citations.map((citation, index) => {
                              const artifact = artifactById.get(citation.artifactId);
                              const artifactUrl = safeArtifactUrl(artifact?.sourceUrl ?? null);
                              return <li key={`${citation.artifactId}-${index}`}><span className="font-medium">{citation.location}:</span> {citation.finding}{artifactUrl ? <> · <a href={artifactUrl} target="_blank" rel="noreferrer" className="text-primary underline">open artifact</a></> : null}</li>;
                            })}
                          </ul>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow lg:sticky lg:top-24 lg:self-start">
            <h4 className="font-headline text-lg font-semibold text-on-surface">Admin decision</h4>
            <p className="mt-1 text-sm text-on-surface-variant">AI must first pass every mandatory requirement. Admin approval remains the final decision; approving both deliverables queues the scrum master plan.</p>

            <label className="mt-5 block text-sm font-medium text-on-surface" htmlFor="admin-notes">Admin notes</label>
            <textarea
              id="admin-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={7}
              className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm outline-none transition focus:border-primary"
              placeholder="Optional notes for the freelancer or internal review..."
            />

            <div className="mt-5 grid gap-2">
              <Button type="button" disabled={!canApprove} loading={actionLoading === "approved"} onClick={() => decide("approved")}>
                <CheckCircle2 size={16} /> Approve
              </Button>
              {!canApprove ? <p className="text-xs leading-5 text-on-surface-variant">Approval unlocks only after evaluation completes with an approve recommendation.</p> : null}
              <Button type="button" variant="outline" loading={actionLoading === "changes_requested"} onClick={() => decide("changes_requested")}>
                <MessageSquareWarning size={16} /> Request changes
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-error/30 text-error hover:bg-error/10"
                loading={actionLoading === "rejected"}
                onClick={() => decide("rejected")}
              >
                <XCircle size={16} /> Reject
              </Button>
            </div>
          </aside>
        </div>
      )}
    </DashboardShell>
  );
}
