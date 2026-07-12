"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  getFreelancerDetail,
  updateFreelancerVerification,
  type FreelancerDetail,
} from "@/services/admin";
import { ArrowLeft, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

const statusLabels: Record<string, string> = {
  assessment_submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  interview_pending: "Interview Pending",
};

export default function FreelancerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<FreelancerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const loadDetail = async () => {
    try {
      const data = await getFreelancerDetail(params.id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load freelancer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [params.id]);

  const handleAction = async (status: "approved" | "rejected" | "interview_pending") => {
    if (status === "rejected" && !rejectReason.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }

    setActioning(true);
    setError(null);
    try {
      await updateFreelancerVerification(params.id, {
        status,
        reason: status === "rejected" ? rejectReason : undefined,
      });
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActioning(false);
      setShowRejectReason(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell role="admin" title="Freelancer Review" subtitle="Loading...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !detail) {
    return (
      <DashboardShell role="admin" title="Freelancer Review" subtitle="Error">
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          {error || "Freelancer not found"}
        </div>
      </DashboardShell>
    );
  }

  const { profile, assessment } = detail;
  const isReviewable = profile.verificationStatus === "assessment_submitted";

  return (
    <DashboardShell
      role="admin"
      title="Freelancer Review"
      subtitle={`Reviewing ${profile.name}`}
    >
      <div className="mb-4">
        <Button
          variant="outline"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm"
          onClick={() => router.push("/dashboard/admin/freelancers")}
        >
          <ArrowLeft size={16} />
          Back to queue
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile info */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <h3 className="font-headline text-lg font-semibold text-on-surface">Freelancer</h3>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Name</span>
                <span className="font-medium text-on-surface">{profile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Email</span>
                <span className="font-medium text-on-surface">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Headline</span>
                <span className="font-medium text-on-surface">{profile.headline || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Skills</span>
                <span className="font-medium text-on-surface">
                  {profile.skills?.join(", ") || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Experience</span>
                <span className="font-medium text-on-surface">{profile.yearsExperience || 0} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Hourly Rate</span>
                <span className="font-medium text-on-surface">${profile.hourlyRate || 0}/hr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">CV</span>
                {profile.cvUrl ? (
                  <a
                    href={profile.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-container hover:underline"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-on-surface-variant">—</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Status</span>
                <span className="font-medium text-on-surface">
                  {statusLabels[profile.verificationStatus] || profile.verificationStatus}
                </span>
              </div>
              {profile.assessmentScore && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Assessment Score</span>
                  <span className="font-medium text-on-surface">{profile.assessmentScore}%</span>
                </div>
              )}
            </div>

            {isReviewable && (
              <div className="mt-6 space-y-3 border-t border-outline-variant/20 pt-4">
                <Button
                  onClick={() => handleAction("approved")}
                  loading={actioning}
                  disabled={actioning}
                  className="w-full"
                >
                  <CheckCircle size={16} className="mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleAction("interview_pending")}
                  loading={actioning}
                  disabled={actioning}
                  variant="outline"
                  className="w-full"
                >
                  <Clock size={16} className="mr-2" />
                  Mark Interview Pending
                </Button>
                <div>
                  {showRejectReason ? (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAction("rejected")}
                          loading={actioning}
                          disabled={actioning}
                          className="flex-1 bg-error text-on-error hover:bg-error/80"
                        >
                          <XCircle size={16} className="mr-2" />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowRejectReason(false);
                            setRejectReason("");
                          }}
                          disabled={actioning}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowRejectReason(true)}
                      className="w-full bg-error text-on-error hover:bg-error/80"
                      disabled={actioning}
                    >
                      <XCircle size={16} className="mr-2" />
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Assessment detail */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <h3 className="font-headline text-lg font-semibold text-on-surface">Assessment</h3>
            {assessment ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Status</span>
                    <span className="font-medium text-on-surface">{assessment.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Score</span>
                    <span className="font-medium text-on-surface">
                      {assessment.score ? `${assessment.score}%` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Started</span>
                    <span className="font-medium text-on-surface">
                      {assessment.startedAt
                        ? new Date(assessment.startedAt).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Submitted</span>
                    <span className="font-medium text-on-surface">
                      {assessment.submittedAt
                        ? new Date(assessment.submittedAt).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </div>

                {assessment.questions && assessment.questions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-on-surface">Questions & Answers</h4>
                    <div className="mt-2 space-y-4">
                      {assessment.questions.map((q, idx) => {
                        const answer = assessment.answers?.find(
                          (a: any) => a.questionId === q.id
                        );
                        return (
                          <div key={q.id} className="rounded-lg border border-outline-variant/20 p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="text-xs font-medium text-on-surface-variant">
                                  Q{idx + 1} · {q.type} · {q.skill}
                                </span>
                                <p className="mt-1 text-sm text-on-surface">{q.prompt}</p>
                              </div>
                              {q.score !== undefined && (
                                <span className="text-sm font-medium text-on-surface">
                                  {q.score}%
                                </span>
                              )}
                            </div>
                            <div className="mt-2">
                              <p className="text-xs text-on-surface-variant">Answer:</p>
                              <p className="text-sm text-on-surface">
                                {answer?.answer?.value || "No answer"}
                              </p>
                            </div>
                            {q.feedback && (
                              <div className="mt-2">
                                <p className="text-xs text-on-surface-variant">Feedback:</p>
                                <p className="text-sm text-on-surface">{q.feedback}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-on-surface-variant">No assessment found.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}