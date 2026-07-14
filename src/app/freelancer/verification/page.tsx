"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Mail,
  UserRound,
  FileText,
  ClipboardCheck,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  getVerification,
  retryAssessmentGeneration,
  retryCvExtraction,
} from "@/services/assessments";
import type { NextAction, VerificationChecklist } from "@/types/assessment";

type RowState = "done" | "pending" | "action" | "blocked" | "working" | "ready" | "review";
type RetryCommand = "retry_cv_extraction" | "retry_assessment_generation";
type ActionTarget = { label: string; href?: string; command?: RetryCommand };

const BADGE: Record<RowState, { cls: string; label: string }> = {
  done: { cls: "bg-primary-container/15 text-primary-container", label: "Done" },
  pending: { cls: "bg-surface-container-high text-on-surface-variant", label: "Pending" },
  action: { cls: "bg-secondary-container/20 text-secondary", label: "Needs action" },
  blocked: { cls: "bg-error/10 text-error", label: "Blocked" },
  working: { cls: "bg-primary-container/10 text-primary-container", label: "Working" },
  ready: { cls: "bg-primary-container/15 text-primary-container", label: "Ready" },
  review: { cls: "bg-secondary-container/20 text-secondary", label: "In review" },
};

const NEXT_ACTION_CTA: Record<NextAction, ActionTarget | null> = {
  complete_profile: { label: "Complete profile", href: "/profile" },
  verify_email: { label: "Verify email", href: "/email-not-verified" },
  upload_cv: { label: "Upload CV", href: "/profile" },
  retry_cv_extraction: { label: "Retry CV reading", command: "retry_cv_extraction" },
  wait_for_cv_extraction: null,
  wait_for_assessment_generation: null,
  retry_assessment_generation: {
    label: "Retry assessment creation",
    command: "retry_assessment_generation",
  },
  start_assessment: { label: "Start assessment", href: "/freelancer/assessment" },
  continue_assessment: { label: "Continue assessment", href: "/freelancer/assessment" },
  wait_for_review: { label: "View result", href: "/freelancer/assessment/result" },
  approved: { label: "View result", href: "/freelancer/assessment/result" },
  rejected: { label: "View result", href: "/freelancer/assessment/result" },
};

const SUBMITTED_ASSESSMENT_STATUSES = ["submitted", "graded", "needs_review", "passed", "failed"];

interface Row {
  label: string;
  state: RowState;
  detail: string;
  icon: LucideIcon;
  action?: ActionTarget;
}

function buildRows(v: VerificationChecklist): Row[] {
  const a = v.assessment;
  const assessmentStatus = a?.status ?? null;
  const cvExtractionFailed = v.cvExtractionStatus === "failed";
  const cvExtractionWorking =
    v.cvExtractionStatus === "queued" ||
    v.cvExtractionStatus === "processing" ||
    (v.cvUploaded && !v.cvExtracted && v.cvExtractionStatus === "pending");
  const cvReady = v.cvUploaded && v.cvExtracted && !cvExtractionFailed;
  const assessmentGenerationFailed =
    v.assessmentGenerationStatus === "failed" || assessmentStatus === "generation_failed";
  const assessmentWorking =
    v.nextAction === "wait_for_assessment_generation" ||
    v.assessmentGenerationStatus === "queued" ||
    v.assessmentGenerationStatus === "processing" ||
    assessmentStatus === "pending" ||
    assessmentStatus === "generating";
  const assessmentReady = v.nextAction === "start_assessment" || assessmentStatus === "ready";
  const assessmentActive = assessmentStatus === "in_progress";
  const submitted =
    Boolean(a?.submittedAt) ||
    SUBMITTED_ASSESSMENT_STATUSES.includes(assessmentStatus ?? "");
  const manualReviewNeeded = assessmentStatus === "needs_review";
  const reviewWaiting =
    v.verificationStatus === "assessment_submitted" ||
    v.verificationStatus === "interview_pending" ||
    v.nextAction === "wait_for_review" ||
    submitted;

  return [
    {
      label: "Email verified",
      icon: Mail,
      state: v.emailVerified ? "done" : "action",
      detail: v.emailVerified ? "Your email address is confirmed." : "Confirm your email to continue.",
      action: v.emailVerified ? undefined : { label: "Verify email", href: "/email-not-verified" },
    },
    {
      label: "CV uploaded",
      icon: FileText,
      state: cvReady ? "done" : cvExtractionFailed || !v.cvUploaded ? "action" : cvExtractionWorking ? "working" : "pending",
      detail: cvReady
        ? "Your CV has been uploaded and read successfully."
        : cvExtractionFailed
          ? v.cvExtractionError ?? "We couldn't read your CV. Retry processing from the uploaded file."
          : cvExtractionWorking
            ? "Your CV is uploaded. We're reading it now."
            : "Upload your CV to continue.",
      action:
        cvExtractionFailed
          ? { label: "Retry CV reading", command: "retry_cv_extraction" }
          : !v.cvUploaded
            ? { label: "Upload CV", href: "/profile" }
            : undefined,
    },
    {
      label: "Assessment ready",
      icon: ClipboardCheck,
      state: assessmentGenerationFailed
        ? "blocked"
        : submitted || assessmentActive
          ? "done"
          : assessmentReady
            ? "ready"
            : assessmentWorking
              ? "working"
              : "pending",
      detail: assessmentGenerationFailed
        ? v.assessmentGenerationError ?? a?.generationError ?? "We couldn't create the assessment from this CV. Retry the generation job."
        : submitted
          ? "Your assessment was prepared and submitted."
          : assessmentActive
            ? "Your assessment is open and in progress."
            : assessmentReady
              ? "Your assessment is ready to start."
              : assessmentWorking
                ? "We're creating a focused assessment from your CV skills."
                : !cvReady
                  ? "This unlocks after your CV is uploaded and read."
                  : "Your assessment is waiting to be prepared.",
      action:
        assessmentReady
          ? { label: "Start assessment", href: "/freelancer/assessment" }
          : assessmentActive
            ? { label: "Continue assessment", href: "/freelancer/assessment" }
            : assessmentGenerationFailed
              ? {
                  label: "Retry assessment creation",
                  command: "retry_assessment_generation",
                }
            : undefined,
    },
    {
      label: "Assessment submitted",
      icon: Send,
      state: submitted ? "done" : assessmentActive ? "action" : "pending",
      detail: submitted
        ? "Your answers were submitted for review."
        : assessmentActive
          ? "Finish and submit your assessment."
          : "Submit your assessment once you've started it.",
      action: submitted
        ? { label: "View result", href: "/freelancer/assessment/result" }
        : assessmentActive
          ? { label: "Continue assessment", href: "/freelancer/assessment" }
          : undefined,
    },
    {
      label: "Profile completed",
      icon: UserRound,
      state: v.profileComplete
        ? "done"
        : manualReviewNeeded
          ? "review"
          : submitted
            ? "working"
            : "pending",
      detail: v.profileComplete
        ? "Your performance summary and skill ratings are ready."
        : manualReviewNeeded
          ? "Your answers are saved. Admin review will finalize the skill ratings."
        : submitted
          ? "We're preparing your skill ratings from your assessment."
          : "This is generated after your assessment.",
    },
    {
      label: "Admin review",
      icon: ShieldCheck,
      state:
        v.verificationStatus === "approved"
          ? "done"
          : v.verificationStatus === "rejected"
            ? "blocked"
            : reviewWaiting
              ? "review"
              : "pending",
      detail:
        v.verificationStatus === "approved"
          ? "You're verified and ready to take on work."
          : v.verificationStatus === "rejected"
            ? "Your application wasn't approved this time."
            : reviewWaiting
              ? "Your submission is with our team for review."
              : "Our team will review your submission after you submit.",
    },
  ];
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FreelancerVerificationPage() {
  const [data, setData] = useState<VerificationChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingAction, setRetryingAction] = useState<RetryCommand | null>(null);

  const load = useCallback(() => {
    getVerification()
      .then((nextData) => {
        setData(nextData);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load verification status"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const assessmentStatus = data?.assessment?.status ?? null;
    const shouldPoll =
      data?.cvExtractionStatus === "queued" ||
      data?.cvExtractionStatus === "processing" ||
      data?.assessmentGenerationStatus === "queued" ||
      data?.assessmentGenerationStatus === "processing" ||
      assessmentStatus === "pending" ||
      assessmentStatus === "generating";
    if (!shouldPoll) return;
    const interval = window.setInterval(load, 5000);
    return () => window.clearInterval(interval);
  }, [
    data?.assessment?.status,
    data?.assessmentGenerationStatus,
    data?.cvExtractionStatus,
    load,
  ]);

  const retryLoad = () => {
    setLoading(true);
    setError(null);
    load();
  };

  const runRetryAction = async (command: RetryCommand) => {
    setRetryingAction(command);
    setError(null);
    try {
      if (command === "retry_cv_extraction") {
        await retryCvExtraction();
      } else {
        await retryAssessmentGeneration();
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retry processing");
    } finally {
      setRetryingAction(null);
    }
  };

  const cta = data && data.nextAction ? NEXT_ACTION_CTA[data.nextAction] : null;
  const assessmentStatus = data?.assessment?.status ?? null;
  const cvExtractionWorking =
    data?.cvExtractionStatus === "queued" || data?.cvExtractionStatus === "processing";
  const assessmentWorking =
    data?.nextAction === "wait_for_assessment_generation" ||
    data?.assessmentGenerationStatus === "queued" ||
    data?.assessmentGenerationStatus === "processing" ||
    assessmentStatus === "pending" ||
    assessmentStatus === "generating";
  const waitingForReview =
    data?.nextAction === "wait_for_review" ||
    data?.verificationStatus === "assessment_submitted" ||
    data?.verificationStatus === "interview_pending";
  const overallTone: RowState =
    data?.verificationStatus === "approved"
      ? "done"
      : data?.verificationStatus === "rejected"
        ? "blocked"
        : cvExtractionWorking || assessmentWorking
          ? "working"
          : waitingForReview
            ? "review"
            : data?.nextAction === "start_assessment"
              ? "ready"
              : data?.nextAction === "retry_assessment_generation" ||
                  data?.nextAction === "retry_cv_extraction"
                ? "blocked"
                : cta
                  ? "action"
                  : "pending";

  const statusLabel =
    cvExtractionWorking
      ? "Reading CV"
      : assessmentWorking
        ? "Creating assessment"
        : waitingForReview
          ? "In review"
          : data
            ? humanize(data.verificationStatus)
            : "Verification";

  const backgroundStatusText =
    cvExtractionWorking
      ? "Reading your CV"
      : assessmentWorking
        ? "Creating your assessment"
        : null;

  const panelText =
    cvExtractionWorking
      ? "We're reading your CV now. Your assessment will be created automatically after that."
      : assessmentWorking
        ? "We're creating your assessment from your CV. You can leave this page; we'll keep checking."
        : overallTone === "done"
          ? "You're verified and ready to take on work."
          : overallTone === "blocked"
            ? "Open the highlighted step to see what needs attention."
            : overallTone === "review"
              ? "Your submission is with our team for review."
              : overallTone === "ready"
                ? "Your assessment is ready to start."
                : cta
                  ? "Complete the highlighted step to keep moving forward."
                  : "Sit tight. We'll update this as your review progresses.";

  return (
    <DashboardShell
      role="freelancer"
      title="Verification"
      subtitle="Track the steps to get verified and unlock project work."
    >
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 card-shadow">
          <Loader2 size={20} className="animate-spin text-on-surface-variant" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center card-shadow">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
            <AlertCircle size={22} className="text-error" />
          </div>
          <h3 className="text-lg font-semibold text-on-surface">Couldn&apos;t load your status</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-on-surface-variant">{error}</p>
          <Button onClick={retryLoad} variant="outline" className="mx-auto mt-4 w-auto px-5 py-2.5">
            Try again
          </Button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="font-headline text-xl font-bold text-on-surface">Verification status</h2>
                  <span
                    className={clsx(
                      "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      BADGE[overallTone].cls,
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-1 max-w-xl text-sm text-on-surface-variant">{panelText}</p>
                {backgroundStatusText ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-container/10 px-3 py-1 text-xs font-medium text-primary-container">
                    <Loader2 size={13} className="animate-spin" />
                    {backgroundStatusText}
                  </div>
                ) : null}
              </div>
              {cta ? (
                cta.href ? (
                  <Link href={cta.href} className="shrink-0">
                    <Button className="w-full px-5 py-2.5 sm:w-auto">{cta.label}</Button>
                  </Link>
                ) : cta.command ? (
                  <Button
                    onClick={() => runRetryAction(cta.command!)}
                    loading={retryingAction === cta.command}
                    className="w-full px-5 py-2.5 sm:w-auto"
                  >
                    {cta.label}
                  </Button>
                ) : null
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
            <ul className="divide-y divide-outline-variant/30">
              {buildRows(data).map((row) => {
                const Icon = row.icon;
                const badge = BADGE[row.state];
                return (
                  <li key={row.label} className="flex items-center gap-4 p-4 sm:px-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high">
                      <Icon size={18} className="text-on-surface-variant" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-on-surface">{row.label}</p>
                      <p className="text-sm text-on-surface-variant">{row.detail}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          badge.cls,
                        )}
                      >
                        {row.state === "working" ? (
                          <Loader2 size={12} className="mr-1 animate-spin" />
                        ) : null}
                        {badge.label}
                      </span>
                      {row.action ? (
                        row.action.href ? (
                          <Link
                            href={row.action.href}
                            className="text-xs font-semibold text-primary-container hover:underline"
                          >
                            {row.action.label}
                          </Link>
                        ) : row.action.command ? (
                          <button
                            type="button"
                            onClick={() => runRetryAction(row.action!.command!)}
                            disabled={retryingAction === row.action.command}
                            className="text-xs font-semibold text-primary-container hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {retryingAction === row.action.command ? "Retrying..." : row.action.label}
                          </button>
                        ) : null
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}
