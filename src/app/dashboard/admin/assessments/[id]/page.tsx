"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  getAssessmentDetail,
  reviewAssessment,
  type AssessmentDetail,
} from "@/services/admin";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

export default function AssessmentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const loadDetail = async () => {
    try {
      const data = await getAssessmentDetail(params.id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [params.id]);

  const handleReview = async (decision: "pass" | "fail" | "needs_review") => {
    setActioning(true);
    setError(null);
    try {
      await reviewAssessment(params.id, { decision, notes: notes || undefined });
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setActioning(false);
      setShowNotes(false);
      setNotes("");
    }
  };

  if (loading) {
    return (
      <DashboardShell role="admin" title="Assessment Review" subtitle="Loading...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !detail) {
    return (
      <DashboardShell role="admin" title="Assessment Review" subtitle="Error">
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          {error || "Assessment not found"}
        </div>
      </DashboardShell>
    );
  }

  const isReviewable = detail.status === "submitted";

  return (
    <DashboardShell
      role="admin"
      title="Assessment Review"
      subtitle={`Reviewing assessment for ${detail.freelancer.name}`}
    >
      <div className="mb-4">
        <Button
          variant="outline"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm"
          onClick={() => router.push("/dashboard/admin/assessments")}
        >
          <ArrowLeft size={16} />
          Back to queue
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Assessment summary */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <h3 className="font-headline text-lg font-semibold text-on-surface">Assessment</h3>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Freelancer</span>
                <span className="font-medium text-on-surface">{detail.freelancer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Email</span>
                <span className="font-medium text-on-surface">{detail.freelancer.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Status</span>
                <span className="font-medium text-on-surface capitalize">{detail.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Score</span>
                <span className="font-medium text-on-surface">{detail.score ? `${detail.score}%` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Recommendation</span>
                <span className="font-medium text-on-surface capitalize">{detail.recommendation || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Warnings</span>
                <span className="font-medium text-on-surface">{detail.eventsSummary.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Focus lost</span>
                <span className="font-medium text-on-surface">{detail.eventsSummary.focusLost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Fullscreen exits</span>
                <span className="font-medium text-on-surface">{detail.eventsSummary.fullscreenExit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Started</span>
                <span className="font-medium text-on-surface">
                  {new Date(detail.startedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Submitted</span>
                <span className="font-medium text-on-surface">
                  {new Date(detail.submittedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {isReviewable && (
              <div className="mt-6 space-y-3 border-t border-outline-variant/20 pt-4">
                <div className="space-y-2">
                  <Button
                    onClick={() => handleReview("pass")}
                    loading={actioning}
                    disabled={actioning}
                    className="w-full"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Pass
                  </Button>
                  <Button
                    onClick={() => handleReview("needs_review")}
                    loading={actioning}
                    disabled={actioning}
                    variant="outline"
                    className="w-full"
                  >
                    <AlertCircle size={16} className="mr-2" />
                    Needs Review
                  </Button>
                  <Button
                    onClick={() => setShowNotes(!showNotes)}
                    variant="outline"
                    className="w-full"
                    disabled={actioning}
                  >
                    <XCircle size={16} className="mr-2" />
                    Fail
                  </Button>
                </div>

                {showNotes && (
                  <div className="space-y-2 rounded-lg border border-error/30 bg-error-container/10 p-4">
                    <label className="block text-sm font-medium text-on-surface">Reason for failing</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Explain why this assessment fails..."
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReview("fail")}
                        loading={actioning}
                        disabled={actioning || !notes.trim()}
                        className="flex-1 bg-error text-on-error hover:bg-error/80"
                      >
                        <XCircle size={16} className="mr-2" />
                        Confirm Fail
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowNotes(false);
                          setNotes("");
                        }}
                        disabled={actioning}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Questions and answers */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <h3 className="font-headline text-lg font-semibold text-on-surface">Questions & Answers</h3>
            {detail.questions && detail.questions.length > 0 ? (
              <div className="mt-4 space-y-4">
                {detail.questions.map((q, idx) => (
                  <div key={q.id} className="rounded-lg border border-outline-variant/20 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-medium text-on-surface-variant">
                          Q{idx + 1} · {q.type} · {q.skill}
                        </span>
                        <p className="mt-1 text-sm text-on-surface">{q.prompt}</p>
                      </div>
                      {q.score !== undefined && q.score !== null && (
                        <span className="text-sm font-medium text-on-surface">{q.score}%</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-on-surface-variant">Answer:</p>
                      <p className="text-sm text-on-surface">{q.answer?.value || "No answer provided"}</p>
                    </div>
                    {q.feedback && (
                      <div className="mt-2 rounded bg-surface-container-low p-2">
                        <p className="text-xs text-on-surface-variant">Feedback:</p>
                        <p className="text-sm text-on-surface">{q.feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-on-surface-variant">No questions found.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}