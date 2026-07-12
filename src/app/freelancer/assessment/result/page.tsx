"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Loader2, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { getVerification, getCurrentAssessment } from "@/services/assessments";
import type { AssessmentStatus, AssessmentSummary, VerificationChecklist } from "@/types/assessment";

// Derived from the assessment status only — never from rubric/correct answers (§10).
function recommendationLabel(status: AssessmentStatus | undefined): string | null {
  switch (status) {
    case "passed":
      return "Passed";
    case "failed":
      return "Did not pass";
    case "needs_review":
      return "Needs review";
    case "graded":
      return "Graded";
    case "submitted":
      return "Submitted";
    default:
      return null;
  }
}

function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AssessmentResultPage() {
  const [verification, setVerification] = useState<VerificationChecklist | null>(null);
  const [warnings, setWarnings] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([getVerification(), getCurrentAssessment().catch(() => null)])
      .then(([v, current]) => {
        setVerification(v);
        const s = current?.eventsSummary;
        setWarnings(s ? s.focusLost + s.fullscreenExit : null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your result"))
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

  const status = verification?.verificationStatus;
  const assessment = verification?.assessment ?? null;

  return (
    <DashboardShell
      role="freelancer"
      title="Assessment result"
      subtitle="How your skills assessment went and what happens next."
    >
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 card-shadow">
          <Loader2 size={20} className="animate-spin text-on-surface-variant" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center card-shadow">
          <AlertCircle size={22} className="mx-auto mb-3 text-error" />
          <p className="mx-auto max-w-md text-sm text-error">{error}</p>
          <Button onClick={retry} variant="outline" className="mx-auto mt-4 w-auto px-5 py-2.5">
            Try again
          </Button>
        </div>
      ) : status === "assessment_in_progress" ? (
        <ResultShell
          title="Your assessment is still in progress"
          detail="Finish and submit it to see your result."
          actionLabel="Continue assessment"
          href="/freelancer/assessment/exam"
        />
      ) : status === "approved" ? (
        <ResultCard
          tone="success"
          heading="You're verified 🎉"
          sub="Your assessment was reviewed and approved. You're ready to get matched to work."
          assessment={assessment}
          warnings={warnings}
        />
      ) : status === "rejected" ? (
        <ResultCard
          tone="error"
          heading="Not approved this time"
          sub="Your assessment didn't meet the bar for verification. You may be able to try again later."
          assessment={assessment}
          warnings={warnings}
        />
      ) : status === "assessment_submitted" || status === "interview_pending" ? (
        <ResultCard
          tone="pending"
          heading="Submitted — pending review"
          sub="Thanks for completing your assessment. Our team is reviewing it and your status will update here."
          assessment={assessment}
          warnings={warnings}
        />
      ) : (
        <ResultShell
          title="No result yet"
          detail="You haven't completed your skills assessment. Head to your verification page to pick up where you left off."
          actionLabel="Go to verification"
          href="/freelancer/verification"
        />
      )}
    </DashboardShell>
  );
}

function ResultShell({
  title,
  detail,
  actionLabel,
  href,
}: {
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center card-shadow">
      <h2 className="font-headline text-xl font-bold text-on-surface">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-on-surface-variant">{detail}</p>
      <Link href={href} className="mt-4 inline-block">
        <Button className="w-auto px-5 py-2.5">{actionLabel}</Button>
      </Link>
    </div>
  );
}

function ResultCard({
  tone,
  heading,
  sub,
  assessment,
  warnings,
}: {
  tone: "success" | "error" | "pending";
  heading: string;
  sub: string;
  assessment: AssessmentSummary | null;
  warnings: number | null;
}) {
  const toneStyles = {
    success: { icon: CheckCircle2, iconCls: "text-primary-container", bg: "bg-primary-container/15" },
    error: { icon: XCircle, iconCls: "text-error", bg: "bg-error/10" },
    pending: { icon: Clock, iconCls: "text-secondary", bg: "bg-secondary-container/20" },
  } as const;
  const t = toneStyles[tone];
  const Icon = t.icon;

  const rows: { label: string; value: string }[] = [];
  if (assessment?.score != null) rows.push({ label: "Score", value: assessment.score });
  const rec = recommendationLabel(assessment?.status);
  if (rec) rows.push({ label: "Recommendation", value: rec });
  const submitted = formatDateTime(assessment?.submittedAt);
  if (submitted) rows.push({ label: "Submitted", value: submitted });
  if (warnings != null) rows.push({ label: "Focus warnings", value: String(warnings) });

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow sm:p-8">
      <div className="flex items-start gap-3">
        <div className={clsx("rounded-lg p-2.5", t.bg)}>
          <Icon size={22} className={t.iconCls} />
        </div>
        <div className="min-w-0">
          <h2 className="font-headline text-xl font-bold text-on-surface">{heading}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{sub}</p>
        </div>
      </div>

      {rows.length > 0 ? (
        <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-outline-variant/30 bg-outline-variant/20 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="bg-surface-container-lowest p-4">
              <dt className="text-xs text-on-surface-variant">{r.label}</dt>
              <dd className="mt-0.5 font-medium text-on-surface">{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-6">
        <Link href="/freelancer/verification" className="inline-block">
          <Button variant="outline" className="w-auto px-5 py-2.5">
            Back to verification
          </Button>
        </Link>
      </div>
    </div>
  );
}
