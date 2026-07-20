"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, MessageSquareWarning, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { getSubmissionDetail, reviewSubmission, type PlanningSubmission } from "@/services/planning";

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
              <div className="mt-2 max-h-[32rem] overflow-auto rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 text-xs leading-5 text-on-surface">
                <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(detail.content || {}, null, 2)}</pre>
              </div>
            </section>
          </div>

          <aside className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow lg:sticky lg:top-24 lg:self-start">
            <h4 className="font-headline text-lg font-semibold text-on-surface">Admin decision</h4>
            <p className="mt-1 text-sm text-on-surface-variant">Approving both architecture and UI/UX automatically queues the scrum master plan.</p>

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
              <Button type="button" loading={actionLoading === "approved"} onClick={() => decide("approved")}>
                <CheckCircle2 size={16} /> Approve
              </Button>
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
