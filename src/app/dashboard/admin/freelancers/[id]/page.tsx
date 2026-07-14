"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  getFreelancerDetail,
  updateFreelancerVerification,
  type FreelancerDetail,
} from "@/services/admin";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Mail,
  ShieldCheck,
  Timer,
  XCircle,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  cv_processing: "Reading CV",
  cv_extraction_failed: "CV Failed",
  assessment_pending: "Assessment Pending",
  assessment_generation_failed: "Assessment Failed",
  assessment_submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  interview_pending: "Interview Pending",
};

const statusStyles: Record<string, string> = {
  cv_processing: "border-primary-container/20 bg-primary-container/10 text-primary-container",
  cv_extraction_failed: "border-error/20 bg-error-container/40 text-error",
  assessment_pending:
    "border-outline-variant/50 bg-surface-container-high text-on-surface-variant",
  assessment_generation_failed: "border-error/20 bg-error-container/40 text-error",
  assessment_submitted:
    "border-outline-variant/50 bg-surface-container-high text-on-surface-variant",
  approved: "border-primary-container/20 bg-primary-container/10 text-primary-container",
  rejected: "border-error/20 bg-error-container/40 text-error",
  interview_pending:
    "border-tertiary-container/20 bg-tertiary-container/10 text-tertiary-container",
};

const SKILL_PREVIEW_LIMIT = 18;

function formatPercent(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}%` : `${value}%`;
}

function formatSkillScore(value: string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : "-";
}

function getSkillScoreClasses(value: string | null | undefined) {
  const score = Number(value);

  if (Number.isFinite(score) && score >= 4) {
    return {
      chip: "border-primary-container/30 bg-primary-container/10 text-primary-container",
      score: "bg-primary-container/15 text-primary-container",
    };
  }

  if (Number.isFinite(score) && score >= 2.5) {
    return {
      chip: "border-amber-300/70 bg-amber-50 text-amber-800",
      score: "bg-amber-100 text-amber-900",
    };
  }

  return {
    chip: "border-outline-variant/50 bg-surface-container-high text-on-surface-variant",
    score: "bg-surface-container-lowest text-on-surface-variant",
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function FreelancerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [detail, setDetail] = useState<FreelancerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showAllSkills, setShowAllSkills] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setDetail(await getFreelancerDetail(params.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load freelancer");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadDetail]);

  const sortedSkillScores = useMemo(
    () =>
      [...(detail?.profile.skillScores ?? [])].sort(
        (a, b) => Number(b.score) - Number(a.score),
      ),
    [detail?.profile.skillScores],
  );

  const visibleSkillScores = showAllSkills
    ? sortedSkillScores
    : sortedSkillScores.slice(0, SKILL_PREVIEW_LIMIT);

  const fallbackSkills = useMemo(
    () =>
      showAllSkills
        ? detail?.profile.skills ?? []
        : (detail?.profile.skills ?? []).slice(0, SKILL_PREVIEW_LIMIT),
    [detail?.profile.skills, showAllSkills],
  );

  const handleDecision = async (
    status: "approved" | "rejected" | "interview_pending",
  ) => {
    if (status === "rejected" && !rejectReason.trim()) {
      setError("Please provide a reason before rejecting this freelancer.");
      return;
    }

    setActioning(status);
    setError(null);

    try {
      await updateFreelancerVerification(params.id, {
        status,
        reason: status === "rejected" ? rejectReason.trim() : undefined,
      });
      toast.success(
        status === "approved"
          ? "Freelancer approved"
          : status === "interview_pending"
            ? "Marked for review"
            : "Freelancer rejected",
        status === "approved"
          ? "They are now available for matching."
          : status === "interview_pending"
            ? "They will stay out of the matching pool until a final decision."
            : "The rejection reason was saved.",
      );
      setShowRejectReason(false);
      setRejectReason("");
      await loadDetail();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update freelancer status";
      setError(message);
      toast.error("Decision failed", message);
    } finally {
      setActioning(null);
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

  if (!detail) {
    return (
      <DashboardShell role="admin" title="Freelancer Review" subtitle="Error">
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          {error || "Freelancer not found"}
        </div>
      </DashboardShell>
    );
  }

  const { profile, assessment } = detail;
  const statusStyle =
    statusStyles[profile.verificationStatus] ||
    "border-outline-variant/50 bg-surface-container-high text-on-surface-variant";

  return (
    <DashboardShell
      role="admin"
      title="Freelancer Review"
      subtitle={`Reviewing ${profile.name}`}
    >
      <div className="mb-4">
        <Button
          variant="outline"
          className="!w-auto px-3 py-2 text-sm"
          onClick={() => router.push("/dashboard/admin/freelancers")}
        >
          <ArrowLeft size={16} />
          Back to queue
        </Button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-error/30 bg-error-container/10 p-4 text-sm text-error">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-2xl font-semibold text-on-primary">
                {getInitials(profile.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-headline text-2xl font-semibold text-on-surface">
                    {profile.name}
                  </h2>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle}`}
                  >
                    {statusLabels[profile.verificationStatus] ||
                      profile.verificationStatus}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-2 break-all text-sm text-on-surface-variant">
                  <Mail size={14} />
                  {profile.email}
                </p>
                {profile.headline ? (
                  <p className="mt-2 text-sm font-medium text-primary-container">
                    {profile.headline}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-primary-container/20 bg-primary-container/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                AI profile summary
              </p>
              <p className="mt-2 max-h-64 overflow-auto pr-1 text-sm leading-6 text-on-surface">
                {profile.aiProfileSummary ||
                  "No AI profile summary was generated for this freelancer yet."}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-headline text-lg font-semibold text-on-surface">
                  Final decision
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  This controls whether the freelancer enters the matching pool.
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle}`}
              >
                {statusLabels[profile.verificationStatus] ||
                  profile.verificationStatus}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                type="button"
                onClick={() => handleDecision("approved")}
                loading={actioning === "approved"}
                disabled={Boolean(actioning)}
                className="!w-full rounded-full px-3 py-2 text-xs"
              >
                <CheckCircle size={15} />
                Accept
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDecision("interview_pending")}
                loading={actioning === "interview_pending"}
                disabled={Boolean(actioning)}
                className="!w-full rounded-full px-3 py-2 text-xs"
              >
                <Clock size={15} />
                Needs review
              </Button>
              <Button
                type="button"
                onClick={() => setShowRejectReason((current) => !current)}
                disabled={Boolean(actioning)}
                className="!w-full rounded-full bg-error px-3 py-2 text-xs text-on-error hover:bg-error/80"
              >
                <XCircle size={15} />
                Reject
              </Button>
            </div>

            {showRejectReason ? (
              <div className="mt-3 rounded-xl border border-error/20 bg-error-container/10 p-3">
                <label className="text-xs font-semibold text-error">
                  Rejection reason
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-error"
                  placeholder="Tell the team why this freelancer is not approved."
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowRejectReason(false);
                      setRejectReason("");
                    }}
                    disabled={Boolean(actioning)}
                    className="!w-auto px-3 py-2 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleDecision("rejected")}
                    loading={actioning === "rejected"}
                    disabled={Boolean(actioning) || !rejectReason.trim()}
                    className="!w-auto bg-error px-3 py-2 text-xs text-on-error hover:bg-error/80"
                  >
                    Confirm reject
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </aside>

        <main className="space-y-6">
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <div className="flex flex-col gap-4 border-b border-outline-variant/20 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Assessment access
                </p>
                <h3 className="mt-1 font-headline text-xl font-semibold text-on-surface">
                  Open the full assessment review when you need evidence
                </h3>
              </div>
              {assessment ? (
                <Link href={`/dashboard/admin/assessments/${assessment.id}`}>
                  <Button className="!w-auto px-4 py-2.5">
                    <FileText size={16} />
                    View assessment
                  </Button>
                </Link>
              ) : (
                <Button className="!w-auto px-4 py-2.5" disabled>
                  <FileText size={16} />
                  No assessment
                </Button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs text-on-surface-variant">Assessment score</p>
                <p className="mt-1 font-headline text-2xl font-semibold text-on-surface">
                  {formatPercent(assessment?.score ?? profile.assessmentScore)}
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs text-on-surface-variant">Recommendation</p>
                <p className="mt-1 font-semibold capitalize text-on-surface">
                  {assessment?.recommendation || "-"}
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs text-on-surface-variant">Warnings</p>
                <p className="mt-1 font-headline text-2xl font-semibold text-on-surface">
                  {assessment?.warningCount ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs text-on-surface-variant">Submitted</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">
                  {assessment?.submittedAt
                    ? new Date(assessment.submittedAt).toLocaleDateString()
                    : "-"}
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
                  <BriefcaseBusiness size={20} />
                </div>
                <h3 className="font-headline text-lg font-semibold text-on-surface">
                  Freelancer details
                </h3>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Experience</dt>
                  <dd className="font-medium text-on-surface">
                    {profile.yearsExperience || 0} years
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Hourly rate</dt>
                  <dd className="font-medium text-on-surface">
                    ${profile.hourlyRate || 0}/hr
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Availability</dt>
                  <dd className="font-medium text-on-surface">
                    {profile.availabilityHoursPerWeek
                      ? `${profile.availabilityHoursPerWeek} hrs/week`
                      : "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">CV</dt>
                  <dd className="font-medium">
                    {profile.cvUrl ? (
                      <a
                        href={profile.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-container hover:underline"
                      >
                        View CV
                      </a>
                    ) : (
                      <span className="text-on-surface">-</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
                  <Timer size={20} />
                </div>
                <h3 className="font-headline text-lg font-semibold text-on-surface">
                  Timeline
                </h3>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Profile created</dt>
                  <dd className="font-medium text-on-surface">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Assessment started</dt>
                  <dd className="font-medium text-on-surface">
                    {assessment?.startedAt
                      ? new Date(assessment.startedAt).toLocaleString()
                      : "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Approved</dt>
                  <dd className="font-medium text-on-surface">
                    {profile.approvedAt
                      ? new Date(profile.approvedAt).toLocaleDateString()
                      : "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Rejected</dt>
                  <dd className="font-medium text-on-surface">
                    {profile.rejectedAt
                      ? new Date(profile.rejectedAt).toLocaleDateString()
                      : "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-headline text-lg font-semibold text-on-surface">
                  Assessment skill ratings
                </h3>
                <p className="text-sm text-on-surface-variant">
                  Top skills are ordered from the assessment results.
                </p>
              </div>
            </div>

            {sortedSkillScores.length > 0 ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {visibleSkillScores.map((skill) => {
                    const classes = getSkillScoreClasses(skill.score);

                    return (
                      <span
                        key={skill.id}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${classes.chip}`}
                      >
                        {skill.skill}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${classes.score}`}
                        >
                          {formatSkillScore(skill.score)} / 5
                        </span>
                      </span>
                    );
                  })}
                </div>
                {sortedSkillScores.length > SKILL_PREVIEW_LIMIT ? (
                  <button
                    type="button"
                    onClick={() => setShowAllSkills((current) => !current)}
                    className="mt-4 inline-flex cursor-pointer items-center rounded-full border border-primary-container/20 bg-primary-container/10 px-3 py-1.5 text-xs font-semibold text-primary-container transition-colors hover:bg-primary-container/15"
                  >
                    {showAllSkills
                      ? "Show fewer skills"
                      : `View ${sortedSkillScores.length - SKILL_PREVIEW_LIMIT} more skills`}
                  </button>
                ) : null}
              </>
            ) : fallbackSkills.length > 0 ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {fallbackSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-outline-variant/50 bg-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface-variant"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                {(profile.skills?.length ?? 0) > SKILL_PREVIEW_LIMIT ? (
                  <button
                    type="button"
                    onClick={() => setShowAllSkills((current) => !current)}
                    className="mt-4 inline-flex cursor-pointer items-center rounded-full border border-primary-container/20 bg-primary-container/10 px-3 py-1.5 text-xs font-semibold text-primary-container transition-colors hover:bg-primary-container/15"
                  >
                    {showAllSkills
                      ? "Show fewer skills"
                      : `View ${(profile.skills?.length ?? 0) - SKILL_PREVIEW_LIMIT} more skills`}
                  </button>
                ) : null}
                <p className="mt-3 text-xs text-on-surface-variant">
                  Assessment scores are not available yet, so these are profile skills.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-on-surface-variant">
                No assessment skills saved yet.
              </p>
            )}
          </section>
        </main>
      </div>
    </DashboardShell>
  );
}
