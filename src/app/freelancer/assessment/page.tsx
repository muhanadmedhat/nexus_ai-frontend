"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  ClipboardCheck,
  Clock,
  ListChecks,
  Maximize2,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  getVerification,
  getMySkills,
  startAssessment,
  type Verification,
} from "@/services/assessments";

type Phase = "not_ready" | "ready" | "in_progress" | "submitted" | "done";

function phaseFor(status: string | undefined): Phase {
  switch (status) {
    case "assessment_pending":
      return "ready";
    case "assessment_in_progress":
      return "in_progress";
    case "assessment_submitted":
    case "interview_pending":
      return "submitted";
    case "approved":
    case "rejected":
      return "done";
    default:
      return "not_ready";
  }
}

export default function AssessmentLobbyPage() {
  const router = useRouter();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([getVerification(), getMySkills()])
      .then(([v, s]) => {
        setVerification(v);
        setSkills(s);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your assessment"))
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

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      await startAssessment({ questionCount: 6, durationSeconds: 1800 });
      router.push("/freelancer/assessment/exam");
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Could not start assessment");
      setStarting(false);
    }
  }

  const assessment = verification?.assessment ?? null;
  const phase = phaseFor(verification?.verificationStatus);
  const durationMinutes = Math.round((assessment?.durationSeconds ?? 1800) / 60);
  const questionCount = 6;

  return (
    <DashboardShell
      role="freelancer"
      title="Skills assessment"
      subtitle="A short, timed assessment to verify your skills."
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
          <h3 className="text-lg font-semibold text-on-surface">Couldn&apos;t load your assessment</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-on-surface-variant">{error}</p>
          <Button onClick={retry} variant="outline" className="mx-auto mt-4 w-auto px-5 py-2.5">
            Try again
          </Button>
        </div>
      ) : phase === "ready" ? (
        <div className="mx-auto max-w-2xl space-y-6">
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary-container/15 p-2.5">
                <ClipboardCheck size={20} className="text-primary-container" />
              </div>
              <div className="min-w-0">
                <h2 className="font-headline text-xl font-bold text-on-surface">You&apos;re ready to start</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Answer a short set of questions based on the skills from your CV. Find a quiet moment —
                  you take this once.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border border-outline-variant/30 p-4">
                <ListChecks size={18} className="shrink-0 text-on-surface-variant" />
                <div>
                  <p className="text-sm font-medium text-on-surface">{questionCount} questions</p>
                  <p className="text-xs text-on-surface-variant">Multiple choice &amp; written</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-outline-variant/30 p-4">
                <Clock size={18} className="shrink-0 text-on-surface-variant" />
                <div>
                  <p className="text-sm font-medium text-on-surface">{durationMinutes} minutes</p>
                  <p className="text-xs text-on-surface-variant">Timer starts when you begin</p>
                </div>
              </div>
            </div>

            {skills.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                  Skills tested
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-medium text-on-surface-variant"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-secondary-container/40 bg-secondary-container/20 p-6 card-shadow">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-secondary" />
              <h3 className="font-medium text-on-surface">Before you begin</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <li className="flex items-start gap-2">
                <Maximize2 size={16} className="mt-0.5 shrink-0 text-secondary" />
                The assessment runs in fullscreen. Please stay on this tab until you submit.
              </li>
              <li className="flex items-start gap-2">
                <Eye size={16} className="mt-0.5 shrink-0 text-secondary" />
                We record focus and tab changes to help reviewers understand your session.
              </li>
            </ul>
            <p className="mt-3 text-xs text-on-surface-variant">
              This isn&apos;t about catching you out — it just keeps the assessment fair for everyone.
            </p>
          </section>

          {startError ? <p className="text-sm text-error">{startError}</p> : null}

          <Button onClick={handleStart} loading={starting} className="px-5 py-3">
            Start assessment
          </Button>
        </div>
      ) : phase === "in_progress" ? (
        <LobbyState
          title="You have an assessment in progress"
          detail="Pick up where you left off before the timer runs out."
          actionLabel="Continue assessment"
          href="/freelancer/assessment/exam"
        />
      ) : phase === "submitted" ? (
        <LobbyState
          title="Your assessment is submitted"
          detail="It's with our team for review. We'll update your status once it's done."
          actionLabel="View result"
          href="/freelancer/assessment/result"
        />
      ) : phase === "done" ? (
        <LobbyState
          title="Your assessment is complete"
          detail="You can review the outcome on your result page."
          actionLabel="View result"
          href="/freelancer/assessment/result"
        />
      ) : (
        <LobbyState
          title="Assessment locked"
          detail="Finish the earlier steps on your verification page to unlock the assessment."
          actionLabel="Go to verification"
          href="/freelancer/verification"
        />
      )}
    </DashboardShell>
  );
}

function LobbyState({
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
