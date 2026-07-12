"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Mail,
  UserRound,
  FileText,
  FileSearch,
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
  type NextAction,
  type Verification,
} from "@/services/assessments";

type RowState = "done" | "pending" | "action" | "blocked";

const BADGE: Record<RowState, { cls: string; label: string }> = {
  done: { cls: "bg-primary-container/15 text-primary-container", label: "Done" },
  pending: { cls: "bg-surface-container-high text-on-surface-variant", label: "Pending" },
  action: { cls: "bg-secondary-container/20 text-secondary", label: "Needs action" },
  blocked: { cls: "bg-error/10 text-error", label: "Blocked" },
};

const NEXT_ACTION_CTA: Record<NextAction, { label: string; href: string } | null> = {
  complete_profile: { label: "Complete profile", href: "/profile" },
  verify_email: { label: "Verify email", href: "/email-not-verified" },
  upload_cv: { label: "Upload CV", href: "/profile" },
  wait_for_cv_extraction: null,
  start_assessment: { label: "Start assessment", href: "/freelancer/assessment" },
  continue_assessment: { label: "Continue assessment", href: "/freelancer/assessment" },
  wait_for_review: { label: "View result", href: "/freelancer/assessment/result" },
  approved: { label: "View result", href: "/freelancer/assessment/result" },
  rejected: { label: "View result", href: "/freelancer/assessment/result" },
};

interface Row {
  label: string;
  state: RowState;
  detail: string;
  icon: LucideIcon;
  action?: { label: string; href: string };
}

function buildRows(v: Verification): Row[] {
  const a = v.assessment;
  const submitted =
    Boolean(a?.submittedAt) ||
    ["submitted", "graded", "needs_review", "passed", "failed"].includes(a?.status ?? "");

  return [
    {
      label: "Email verified",
      icon: Mail,
      state: v.emailVerified ? "done" : "action",
      detail: v.emailVerified ? "Your email address is confirmed." : "Confirm your email to continue.",
      action: v.emailVerified ? undefined : { label: "Verify email", href: "/email-not-verified" },
    },
    {
      label: "Profile completed",
      icon: UserRound,
      state: v.profileComplete ? "done" : "action",
      detail: v.profileComplete ? "Your profile details are complete." : "Add your remaining profile details.",
      action: v.profileComplete ? undefined : { label: "Complete profile", href: "/profile" },
    },
    {
      label: "CV uploaded",
      icon: FileText,
      state: v.cvUploaded ? "done" : "action",
      detail: v.cvUploaded ? "We received your CV." : "Upload your CV to continue.",
      action: v.cvUploaded ? undefined : { label: "Upload CV", href: "/profile" },
    },
    {
      label: "CV extracted",
      icon: FileSearch,
      state: v.cvExtracted ? "done" : "pending",
      detail: v.cvExtracted
        ? "We read your skills and experience from your CV."
        : v.cvUploaded
          ? "We're reading your CV — this only takes a moment."
          : "We'll read your CV once it's uploaded.",
    },
    {
      label: "Assessment ready",
      icon: ClipboardCheck,
      state: !a ? "pending" : a.status === "pending" || a.status === "in_progress" ? "action" : "done",
      detail: !a
        ? "Finish the earlier steps to unlock your assessment."
        : a.status === "pending"
          ? "Your assessment is ready to start."
          : a.status === "in_progress"
            ? "Your assessment is in progress."
            : "Your assessment has been prepared.",
      action:
        a?.status === "pending"
          ? { label: "Start assessment", href: "/freelancer/assessment" }
          : a?.status === "in_progress"
            ? { label: "Continue assessment", href: "/freelancer/assessment" }
            : undefined,
    },
    {
      label: "Assessment submitted",
      icon: Send,
      state: submitted ? "done" : a?.status === "in_progress" ? "action" : "pending",
      detail: submitted
        ? "Your answers were submitted for review."
        : a?.status === "in_progress"
          ? "Finish and submit your assessment."
          : "Submit your assessment once you've started it.",
      action: submitted ? { label: "View result", href: "/freelancer/assessment/result" } : undefined,
    },
    {
      label: "Admin review",
      icon: ShieldCheck,
      state:
        v.verificationStatus === "approved" ? "done" : v.verificationStatus === "rejected" ? "blocked" : "pending",
      detail:
        v.verificationStatus === "approved"
          ? "You're verified and ready to take on work."
          : v.verificationStatus === "rejected"
            ? "Your application wasn't approved this time."
            : "Our team will review your submission after you submit.",
    },
  ];
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FreelancerVerificationPage() {
  const [data, setData] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getVerification()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load verification status"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setLoading(true);
    setError(null);
    load();
  };

  const cta = data ? NEXT_ACTION_CTA[data.nextAction] : null;
  const overallTone: RowState =
    data?.verificationStatus === "approved"
      ? "done"
      : data?.verificationStatus === "rejected"
        ? "blocked"
        : cta
          ? "action"
          : "pending";

  const panelText =
    overallTone === "done"
      ? "You're verified — you're all set."
      : overallTone === "blocked"
        ? "Your application wasn't approved. Open your result for details."
        : cta
          ? "Complete the highlighted step to keep moving forward."
          : "Sit tight — we'll update this as your review progresses.";

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
          <Button onClick={retry} variant="outline" className="mx-auto mt-4 w-auto px-5 py-2.5">
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
                    {humanize(data.verificationStatus)}
                  </span>
                </div>
                <p className="mt-1 max-w-xl text-sm text-on-surface-variant">{panelText}</p>
              </div>
              {cta ? (
                <Link href={cta.href} className="shrink-0">
                  <Button className="w-full px-5 py-2.5 sm:w-auto">{cta.label}</Button>
                </Link>
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
                        {badge.label}
                      </span>
                      {row.action ? (
                        <Link
                          href={row.action.href}
                          className="text-xs font-semibold text-primary-container hover:underline"
                        >
                          {row.action.label}
                        </Link>
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
