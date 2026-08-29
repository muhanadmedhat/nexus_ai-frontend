"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getFreelancerDetail,
  reviewPrincipalReviewer,
  updateFreelancerClassification,
  updateFreelancerVerification,
  type FreelancerDetail,
} from "@/services/admin";
import {
  PROFESSIONAL_ROLE_OPTIONS,
  SENIORITY_OPTIONS,
  professionalTitle,
  type ProfessionalRole,
  type SeniorityLevel,
} from "@/lib/professional-classification";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Mail,
  Save,
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
  cv_processing:
    "border-primary-container/20 bg-primary-container/10 text-primary-container",
  cv_extraction_failed: "border-error/20 bg-error-container/40 text-error",
  assessment_pending:
    "border-outline-variant/50 bg-surface-container-high text-on-surface-variant",
  assessment_generation_failed:
    "border-error/20 bg-error-container/40 text-error",
  assessment_submitted:
    "border-outline-variant/50 bg-surface-container-high text-on-surface-variant",
  approved:
    "border-primary-container/20 bg-primary-container/10 text-primary-container",
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
  const [principalRate, setPrincipalRate] = useState("");
  const [principalCapacity, setPrincipalCapacity] = useState("3");
  const [principalReason, setPrincipalReason] = useState("");
  const [principalOverride, setPrincipalOverride] = useState(false);
  const [classificationRole, setClassificationRole] = useState<
    ProfessionalRole | ""
  >("");
  const [classificationSeniority, setClassificationSeniority] = useState<
    SeniorityLevel | ""
  >("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const next = await getFreelancerDetail(params.id);
      setDetail(next);
      setPrincipalRate(next.profile.principalReviewerHourlyRate ?? "");
      setPrincipalCapacity(
        String(next.profile.principalReviewerMaxProjects ?? 3),
      );
      setClassificationRole(next.profile.professionalRole ?? "");
      setClassificationSeniority(next.profile.seniorityLevel ?? "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load freelancer",
      );
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
        ? (detail?.profile.skills ?? [])
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
        err instanceof Error
          ? err.message
          : "Could not update freelancer status";
      setError(message);
      toast.error("Decision failed", message);
    } finally {
      setActioning(null);
    }
  };

  const handlePrincipalDecision = async (
    status: "approved" | "rejected" | "suspended",
  ) => {
    const reason = principalReason.trim();
    if (status !== "approved" && !reason) {
      setError("A reason is required to reject or suspend reviewer access.");
      return;
    }
    if (status === "approved" && principalOverride && !reason) {
      setError("Document why the qualification requirements are overridden.");
      return;
    }
    const hourlyRate = Number(principalRate);
    const maxConcurrentProjects = Number(principalCapacity);
    if (
      status === "approved" &&
      principalRate &&
      (!hourlyRate || hourlyRate <= 0)
    ) {
      setError("Reviewer hourly rate must be positive.");
      return;
    }
    if (
      status === "approved" &&
      (!Number.isInteger(maxConcurrentProjects) ||
        maxConcurrentProjects < 1 ||
        maxConcurrentProjects > 3)
    ) {
      setError("Reviewer capacity must be between 1 and 3 projects.");
      return;
    }

    setActioning(`principal_${status}`);
    setError(null);
    try {
      const updated = await reviewPrincipalReviewer(params.id, {
        status,
        reason: reason || undefined,
        hourlyRate:
          status === "approved" && principalRate ? hourlyRate : undefined,
        maxConcurrentProjects:
          status === "approved" ? maxConcurrentProjects : undefined,
        override: status === "approved" ? principalOverride : undefined,
      });
      setDetail(updated);
      setPrincipalRate(updated.profile.principalReviewerHourlyRate ?? "");
      setPrincipalCapacity(
        String(updated.profile.principalReviewerMaxProjects ?? 3),
      );
      setPrincipalReason("");
      setPrincipalOverride(false);
      toast.success(
        status === "approved"
          ? "Principal reviewer approved"
          : status === "suspended"
            ? "Reviewer access paused"
            : "Reviewer application rejected",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save reviewer decision";
      setError(message);
      toast.error("Reviewer decision failed", message);
    } finally {
      setActioning(null);
    }
  };

  const handleClassificationSave = async () => {
    if (!classificationRole || !classificationSeniority) {
      setError("Choose both a professional role and seniority level.");
      return;
    }

    setActioning("classification");
    setError(null);
    try {
      const updated = await updateFreelancerClassification(params.id, {
        professionalRole: classificationRole,
        seniorityLevel: classificationSeniority,
      });
      setDetail(updated);
      toast.success(
        "Platform position updated",
        `${updated.profile.name} is now ${updated.profile.professionalTitle}.`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update platform position";
      setError(message);
      toast.error("Position update failed", message);
    } finally {
      setActioning(null);
    }
  };

  if (loading) {
    return (
      <DashboardShell
        role="admin"
        title="Freelancer Review"
        subtitle="Loading..."
      >
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
  const isFinalStatus =
    profile.verificationStatus === "approved" ||
    profile.verificationStatus === "rejected";
  const principalOverrideRequired =
    profile.principalReviewerStatus !== "pending" ||
    !profile.principalReviewerEligibility.eligibleToApply;
  const principalApplicationStatement =
    typeof profile.principalReviewerQualification?.statement === "string"
      ? profile.principalReviewerQualification.statement
      : null;

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

            <div className="mt-5 border-t border-outline-variant/30 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-on-surface-variant">
                    Platform position
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {professionalTitle(
                      profile.professionalRole,
                      profile.seniorityLevel,
                    ) || "Unclassified"}
                  </p>
                  {profile.assessmentTargetRole ? (
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Assessment target: {professionalTitle(
                        profile.assessmentTargetRole,
                        profile.assessmentTargetSeniority,
                      )}
                    </p>
                  ) : null}
                </div>
                {profile.principalReviewerStatus === "approved" ? (
                  <span className="rounded-full border border-primary-container/20 bg-primary-container/10 px-2.5 py-1 text-xs font-semibold text-primary-container">
                    Principal reviewer
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                <select
                  value={classificationRole}
                  onChange={(event) =>
                    setClassificationRole(event.target.value as ProfessionalRole)
                  }
                  className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
                  aria-label="Professional role"
                >
                  <option value="">Select role</option>
                  {PROFESSIONAL_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={classificationSeniority}
                  onChange={(event) =>
                    setClassificationSeniority(
                      event.target.value as SeniorityLevel,
                    )
                  }
                  className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
                  aria-label="Seniority level"
                >
                  <option value="">Select level</option>
                  {SENIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  loading={actioning === "classification"}
                  disabled={Boolean(actioning)}
                  onClick={handleClassificationSave}
                  className="!w-auto px-3 py-2"
                  title="Save platform position"
                >
                  <Save size={16} />
                  <span className="sr-only">Save platform position</span>
                </Button>
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

            {isFinalStatus ? (
              <div
                className={`mt-4 flex items-start gap-3 rounded-xl border p-4 ${statusStyle}`}
              >
                {profile.verificationStatus === "approved" ? (
                  <CheckCircle size={18} className="mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={18} className="mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold">
                    {statusLabels[profile.verificationStatus]}
                  </p>
                  <p className="mt-1 text-xs leading-5 opacity-80">
                    {profile.verificationStatus === "approved"
                      ? "This freelancer is already in the matching pool."
                      : "This freelancer has already been declined for now."}
                  </p>
                </div>
              </div>
            ) : (
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
            )}

            {!isFinalStatus && showRejectReason ? (
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
            <div className="flex flex-col gap-3 border-b border-outline-variant/20 pb-5 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-headline text-xl font-semibold text-on-surface">
                    Principal reviewer qualification
                  </h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Separate senior approval for architecture, code review,
                    risk, and delivery governance.
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full border border-primary-container/25 bg-primary-container/10 px-3 py-1 text-xs font-semibold capitalize text-primary-container">
                {profile.principalReviewerStatus.replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs text-on-surface-variant">Experience</p>
                <p className="mt-1 font-semibold text-on-surface">
                  {
                    profile.principalReviewerEligibility.requirements
                      .yearsExperience
                  }{" "}
                  /{" "}
                  {
                    profile.principalReviewerEligibility.requirements
                      .minimumExperienceYears
                  }{" "}
                  years
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs text-on-surface-variant">Assessment</p>
                <p className="mt-1 font-semibold text-on-surface">
                  {
                    profile.principalReviewerEligibility.requirements
                      .assessmentScore
                  }
                  % /{" "}
                  {
                    profile.principalReviewerEligibility.requirements
                      .minimumAssessmentScore
                  }
                  %
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs text-on-surface-variant">
                  Assessed skills
                </p>
                <p className="mt-1 font-semibold text-on-surface">
                  {
                    profile.principalReviewerEligibility.requirements
                      .qualifiedSkills.length
                  }{" "}
                  qualified
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs text-on-surface-variant">Performance</p>
                <p className="mt-1 font-semibold text-on-surface">
                  {
                    profile.principalReviewerEligibility.requirements
                      .performanceScore
                  }
                  % /{" "}
                  {
                    profile.principalReviewerEligibility.requirements
                      .minimumPerformanceScore
                  }
                  %
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs text-on-surface-variant">Current load</p>
                <p className="mt-1 font-semibold text-on-surface">
                  {profile.principalReviewerActiveProjects} /{" "}
                  {profile.principalReviewerMaxProjects} projects
                </p>
              </div>
            </div>

            {principalApplicationStatement ? (
              <div className="mt-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Applicant statement
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface">
                  {principalApplicationStatement}
                </p>
              </div>
            ) : null}

            {profile.principalReviewerEligibility.requirements
              .declaredRelevantSkills.length > 0 ? (
              <p className="mt-4 text-sm text-on-surface-variant">
                Declared reviewer skills:{" "}
                {profile.principalReviewerEligibility.requirements.declaredRelevantSkills.join(
                  ", ",
                )}
              </p>
            ) : null}

            {profile.principalReviewerEligibility.gaps.length > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Qualification gaps</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {profile.principalReviewerEligibility.gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {profile.principalReviewerRejectionReason ? (
              <div className="mt-4 rounded-xl border border-error/20 bg-error-container/10 p-4 text-sm text-error">
                {profile.principalReviewerRejectionReason}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input
                label="Reviewer hourly rate"
                type="number"
                min={1}
                value={principalRate}
                onChange={(event) => setPrincipalRate(event.target.value)}
                placeholder="Defaults to 120% of freelancer rate"
              />
              <Input
                label="Maximum concurrent projects"
                type="number"
                min={1}
                max={3}
                value={principalCapacity}
                onChange={(event) => setPrincipalCapacity(event.target.value)}
              />
            </div>
            <label className="mt-4 block text-sm font-semibold text-on-surface">
              Decision notes
            </label>
            <textarea
              value={principalReason}
              onChange={(event) => setPrincipalReason(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Required for rejection, suspension, or an eligibility override."
              className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
            />
            {principalOverrideRequired ? (
              <label className="mt-3 flex items-start gap-2 text-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={principalOverride}
                  onChange={(event) =>
                    setPrincipalOverride(event.target.checked)
                  }
                  className="mt-1"
                />
                Approve as a documented admin override
                {profile.principalReviewerStatus !== "pending"
                  ? " without a pending freelancer application."
                  : " despite the listed gaps."}
              </label>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                className="!w-auto px-4 py-2.5"
                loading={actioning === "principal_approved"}
                disabled={
                  Boolean(actioning) ||
                  (principalOverrideRequired && !principalOverride)
                }
                onClick={() => handlePrincipalDecision("approved")}
              >
                Approve reviewer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="!w-auto px-4 py-2.5"
                loading={actioning === "principal_suspended"}
                disabled={
                  Boolean(actioning) ||
                  profile.principalReviewerStatus !== "approved"
                }
                onClick={() => handlePrincipalDecision("suspended")}
              >
                Suspend
              </Button>
              <Button
                type="button"
                className="!w-auto bg-error px-4 py-2.5 text-on-error hover:bg-error/80"
                loading={actioning === "principal_rejected"}
                disabled={
                  Boolean(actioning) ||
                  profile.principalReviewerStatus !== "pending"
                }
                onClick={() => handlePrincipalDecision("rejected")}
              >
                Reject application
              </Button>
            </div>
          </section>

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
                <p className="text-xs text-on-surface-variant">
                  Assessment score
                </p>
                <p className="mt-1 font-headline text-2xl font-semibold text-on-surface">
                  {formatPercent(assessment?.score ?? profile.assessmentScore)}
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs text-on-surface-variant">
                  Recommendation
                </p>
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
                    {profile.hourlyRate || 0} EGP/hr
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
                  <dt className="text-on-surface-variant">
                    Assessment started
                  </dt>
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
                  Assessment scores are not available yet, so these are profile
                  skills.
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
