"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { getVerification, getCurrentAssessment } from "@/services/assessments";
import type { AssessmentStatus, AssessmentSummary, VerificationChecklist } from "@/types/assessment";
import { professionalTitle } from "@/lib/professional-classification";

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
        setError(null);
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
  const gradingComplete = assessment?.result?.gradingComplete === true;

  useEffect(() => {
    if (
      status !== "assessment_submitted" &&
      status !== "interview_pending"
    ) {
      return;
    }
    const interval = window.setInterval(load, 8000);
    return () => window.clearInterval(interval);
  }, [load, status]);

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
          heading="You're verified"
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
      ) : status === "interview_pending" ? (
        <ResultCard
          tone="pending"
          heading="Assessment review passed"
          sub="Your grading and admin review are complete. Your verification is now at the interview stage, and this page will keep updating automatically."
          assessment={assessment}
          warnings={warnings}
          onRefresh={load}
        />
      ) : status === "assessment_submitted" && gradingComplete ? (
        <ResultCard
          tone="pending"
          heading="Your grading result is ready"
          sub="Your score and platform rank are already stored. A human approval check is still open; you do not need to retake the assessment."
          assessment={assessment}
          warnings={warnings}
          onRefresh={load}
        />
      ) : status === "assessment_submitted" ? (
        <ResultCard
          tone="pending"
          heading="Submitted — grading in progress"
          sub="Your answers were saved successfully. This page checks for the grading result every few seconds, so you do not have to rely on notifications."
          assessment={assessment}
          warnings={warnings}
          onRefresh={load}
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
  onRefresh,
}: {
  tone: "success" | "error" | "pending";
  heading: string;
  sub: string;
  assessment: AssessmentSummary | null;
  warnings: number | null;
  onRefresh?: () => void;
}) {
  const toneStyles = {
    success: { icon: CheckCircle2, iconCls: "text-primary-container", bg: "bg-primary-container/15" },
    error: { icon: XCircle, iconCls: "text-error", bg: "bg-error/10" },
    pending: { icon: Clock, iconCls: "text-secondary", bg: "bg-secondary-container/20" },
  } as const;
  const t = toneStyles[tone];
  const Icon = t.icon;

  const rows: { label: string; value: string }[] = [];
  const targetTitle = professionalTitle(
    assessment?.targetRole,
    assessment?.targetSeniority,
  );
  const resultTitle = professionalTitle(
    assessment?.resultRole,
    assessment?.resultSeniority,
  );
  const result = assessment?.result ?? null;
  if (targetTitle) rows.push({ label: "Assessment taken", value: targetTitle });
  if (resultTitle) rows.push({ label: "Platform rank", value: resultTitle });
  if (assessment?.score != null) rows.push({ label: "Score", value: assessment.score });
  const rec = recommendationLabel(assessment?.status);
  if (rec) rows.push({ label: "Recommendation", value: rec });
  const submitted = formatDateTime(assessment?.submittedAt);
  if (submitted) rows.push({ label: "Submitted", value: submitted });
  if (warnings != null) rows.push({ label: "Focus warnings", value: String(warnings) });
  if (result?.graderConfidence != null) {
    rows.push({
      label: "Grading confidence",
      value: `${Math.round(result.graderConfidence * 100)}%`,
    });
  }

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

      {result?.feedback && (
        <section className="mt-6 border-y border-outline-variant/30 py-4">
          <h3 className="font-semibold text-on-surface">Overall feedback</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
            {result.feedback}
          </p>
        </section>
      )}

      {result?.performance.questionsEvaluated ? (
        <section className="mt-6">
          <h3 className="font-semibold text-on-surface">Answer breakdown</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            A high-level view of the grading evidence. Answer keys and private
            rubrics stay protected.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-outline-variant/30 py-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-on-surface-variant">Evaluated</dt>
              <dd className="mt-1 text-lg font-semibold text-on-surface">
                {result.performance.questionsEvaluated}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-surface-variant">Strong</dt>
              <dd className="mt-1 text-lg font-semibold text-primary-container">
                {result.performance.strongAnswers}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-surface-variant">Partial</dt>
              <dd className="mt-1 text-lg font-semibold text-on-surface">
                {result.performance.partialAnswers}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-surface-variant">Improve</dt>
              <dd className="mt-1 text-lg font-semibold text-error">
                {result.performance.weakAnswers}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {(result?.strengths.length ?? 0) > 0 && (
        <section className="mt-6">
          <h3 className="font-semibold text-on-surface">Demonstrated well</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-on-surface-variant">
            {result?.strengths.map((item, index) => (
              <li key={`strength-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {(result?.improvements.length ?? 0) > 0 && (
        <section className="mt-6">
          <h3 className="font-semibold text-on-surface">What to improve</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-on-surface-variant">
            {result?.improvements.map((item, index) => (
              <li key={`improvement-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {result?.manualReviewRequired && (
        <section className="mt-6 border-l-2 border-secondary pl-4">
          <h3 className="font-semibold text-on-surface">
            Why approval is still pending
          </h3>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            Grading is finished, but automatic approval could not make the
            final verification decision. An admin is checking grading
            confidence, session integrity, and required matching details. Your
            score and assessed position will remain visible while that happens.
          </p>
          {result.integrityWarningCount > 0 && (
            <p className="mt-2 text-sm font-medium text-on-surface">
              Session integrity signals recorded: {result.integrityWarningCount}
            </p>
          )}
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/freelancer/verification" className="inline-block">
          <Button variant="outline" className="w-auto px-5 py-2.5">
            Back to verification
          </Button>
        </Link>
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            className="w-auto px-5 py-2.5"
            onClick={onRefresh}
          >
            <RefreshCw size={15} /> Refresh result
          </Button>
        )}
      </div>
    </div>
  );
}
