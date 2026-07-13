"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  getAssessmentDetail,
  updateAssessmentQuestionScore,
  updateAssessmentScore,
  updateFreelancerSkillScore,
  type AssessmentDetail,
} from "@/services/admin";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

function getAnswerText(answer: unknown) {
  if (typeof answer === "string") return answer;
  if (!answer || typeof answer !== "object") return "";

  const value = (answer as { value?: unknown; choiceId?: unknown }).value;
  if (typeof value === "string") return value;
  if (value !== null && value !== undefined) return JSON.stringify(value);

  const choiceId = (answer as { choiceId?: unknown }).choiceId;
  if (typeof choiceId === "string") return choiceId;

  return JSON.stringify(answer);
}

function formatPercent(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}%` : `${value}%`;
}

function formatSkillScore(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : value;
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default function AssessmentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [behaviorOpen, setBehaviorOpen] = useState(false);
  const [overallScore, setOverallScore] = useState("");
  const [scoreNotes, setScoreNotes] = useState("");
  const [scoreSaving, setScoreSaving] = useState(false);
  const [questionScores, setQuestionScores] = useState<Record<string, string>>({});
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, string>>({});
  const [questionSaving, setQuestionSaving] = useState<string | null>(null);
  const [skillScores, setSkillScores] = useState<Record<string, string>>({});
  const [skillSaving, setSkillSaving] = useState<string | null>(null);
  const [questionPage, setQuestionPage] = useState(0);

  const applyDetail = useCallback((nextDetail: AssessmentDetail) => {
    setDetail(nextDetail);
    setOverallScore(nextDetail.score ?? "");
    setQuestionScores(
      Object.fromEntries(
        nextDetail.questions.map((question) => [question.id, question.score ?? ""]),
      ),
    );
    setQuestionFeedback(
      Object.fromEntries(
        nextDetail.questions.map((question) => [question.id, question.feedback ?? ""]),
      ),
    );
    setSkillScores(
      Object.fromEntries(nextDetail.skillScores.map((skill) => [skill.id, skill.score])),
    );
    setQuestionPage((current) =>
      Math.min(current, Math.max(nextDetail.questions.length - 1, 0)),
    );
  }, []);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      applyDetail(await getAssessmentDetail(params.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  }, [applyDetail, params.id]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadDetail]);

  const currentQuestion = detail?.questions[questionPage] ?? null;
  const sortedSkillScores = useMemo(
    () =>
      [...(detail?.skillScores ?? [])].sort(
        (a, b) => Number(b.score) - Number(a.score),
      ),
    [detail?.skillScores],
  );

  const handleOverallScoreSave = async () => {
    const score = Number(overallScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setError("Overall score must be between 0 and 100.");
      return;
    }

    setScoreSaving(true);
    setError(null);
    try {
      applyDetail(
        await updateAssessmentScore(params.id, {
          score,
          notes: scoreNotes.trim() || undefined,
        }),
      );
      setScoreNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update score");
    } finally {
      setScoreSaving(false);
    }
  };

  const handleQuestionScoreSave = async (questionId: string) => {
    const score = Number(questionScores[questionId]);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setError("Question score must be between 0 and 100.");
      return;
    }

    setQuestionSaving(questionId);
    setError(null);
    try {
      applyDetail(
        await updateAssessmentQuestionScore(params.id, questionId, {
          score,
          feedback: questionFeedback[questionId]?.trim() || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update question score");
    } finally {
      setQuestionSaving(null);
    }
  };

  const handleSkillScoreSave = async (skillScoreId: string) => {
    if (!detail) return;

    const score = Number(skillScores[skillScoreId]);
    if (!Number.isFinite(score) || score < 0 || score > 5) {
      setError("Skill score must be between 0 and 5.");
      return;
    }

    setSkillSaving(skillScoreId);
    setError(null);
    try {
      await updateFreelancerSkillScore(detail.freelancer.id, skillScoreId, { score });
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update skill score");
    } finally {
      setSkillSaving(null);
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

  if (!detail) {
    return (
      <DashboardShell role="admin" title="Assessment Review" subtitle="Error">
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          {error || "Assessment not found"}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role="admin"
      title="Assessment Review"
      subtitle={`Reviewing assessment for ${detail.freelancer.name}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          className="!w-auto px-3 py-2 text-sm"
          onClick={() => router.push("/dashboard/admin/assessments")}
        >
          <ArrowLeft size={16} />
          Back to queue
        </Button>
        <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold capitalize text-on-surface-variant">
          {statusLabel(detail.status)}
        </span>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-error/30 bg-error-container/10 p-4 text-sm text-error">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[520px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Candidate
            </p>
            <h2 className="mt-2 font-headline text-2xl font-semibold text-on-surface">
              {detail.freelancer.name}
            </h2>
            <p className="mt-1 break-all text-sm text-on-surface-variant">
              {detail.freelancer.email}
            </p>
            {detail.freelancer.headline ? (
              <p className="mt-1 text-sm text-on-surface-variant">
                {detail.freelancer.headline}
              </p>
            ) : null}

            <div className="mt-5 rounded-lg border border-primary-container/20 bg-primary-container/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                AI profile summary
              </p>
              <p className="mt-2 text-sm leading-6 text-on-surface">
                {detail.profileSummary ||
                  "No profile summary was generated for this candidate yet."}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-surface-container-low p-3">
                <p className="text-xs text-on-surface-variant">Score</p>
                <p className="mt-1 font-headline text-xl font-semibold text-on-surface">
                  {formatPercent(detail.score)}
                </p>
              </div>
              <div className="rounded-lg bg-surface-container-low p-3">
                <p className="text-xs text-on-surface-variant">AI recommendation</p>
                <p className="mt-1 font-semibold capitalize text-on-surface">
                  {detail.recommendation || "-"}
                </p>
              </div>
              <div className="rounded-lg bg-surface-container-low p-3">
                <p className="text-xs text-on-surface-variant">Warnings</p>
                <p className="mt-1 font-headline text-xl font-semibold text-on-surface">
                  {detail.eventsSummary.warningCount}
                </p>
              </div>
              <div className="rounded-lg bg-surface-container-low p-3">
                <p className="text-xs text-on-surface-variant">Questions</p>
                <p className="mt-1 font-headline text-xl font-semibold text-on-surface">
                  {detail.questions.length}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-headline text-lg font-semibold text-on-surface">
                  Freelancer decision
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Approve, reject, or hold the freelancer from their profile review.
                </p>
              </div>
              <Link href={`/dashboard/admin/freelancers/${detail.freelancer.id}`}>
                <Button className="!w-auto px-4 py-2 text-sm">
                  Open freelancer review
                </Button>
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
            <h3 className="font-headline text-lg font-semibold text-on-surface">
              Score override
            </h3>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={overallScore}
                onChange={(event) => setOverallScore(event.target.value)}
                className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
                placeholder="0-100"
              />
              <Button
                type="button"
                onClick={handleOverallScoreSave}
                loading={scoreSaving}
                className="!w-auto px-4 py-2 text-sm"
              >
                Save
              </Button>
            </div>
            <textarea
              value={scoreNotes}
              onChange={(event) => setScoreNotes(event.target.value)}
              rows={2}
              className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
              placeholder="Optional score note"
            />
          </section>

          {sortedSkillScores.length > 0 ? (
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
              <h3 className="font-headline text-lg font-semibold text-on-surface">
                Top skills
              </h3>
              <div className="mt-3 max-h-96 space-y-2 overflow-auto pr-1">
                {sortedSkillScores.map((skill) => (
                  <div
                    key={skill.id}
                    className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-on-surface">
                        {skill.skill}
                      </p>
                      <span className="shrink-0 rounded-full bg-primary-container/15 px-2 py-0.5 text-xs font-semibold text-primary-container">
                        {formatSkillScore(skill.score)} / 5
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <input
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        value={skillScores[skill.id] ?? ""}
                        onChange={(event) =>
                          setSkillScores((current) => ({
                            ...current,
                            [skill.id]: event.target.value,
                          }))
                        }
                        className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-sm text-on-surface outline-none focus:border-primary-container"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        loading={skillSaving === skill.id}
                        onClick={() => handleSkillScoreSave(skill.id)}
                        className="!w-auto px-3 py-1.5 text-sm"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-headline text-lg font-semibold text-on-surface">
                  Exam behavior
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {detail.eventsSummary.warningCount} warnings from{" "}
                  {detail.eventsSummary.total} tracked events.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBehaviorOpen((open) => !open)}
                className="!w-auto px-3 py-2 text-sm"
              >
                {behaviorOpen ? <EyeOff size={16} /> : <Eye size={16} />}
                {behaviorOpen ? "Hide" : "View"}
              </Button>
            </div>
            {behaviorOpen ? (
              <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                {detail.events.length > 0 ? (
                  detail.events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium capitalize text-on-surface">
                          {statusLabel(event.eventType)}
                        </span>
                        <span
                          className={
                            event.isWarning
                              ? "rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error"
                              : "rounded-full bg-surface-container-high px-2 py-0.5 text-xs font-medium text-on-surface-variant"
                          }
                        >
                          {event.isWarning ? "Warning" : "Info"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                      {event.metadata ? (
                        <pre className="mt-2 max-h-28 overflow-auto rounded bg-surface-container-high p-2 text-xs text-on-surface-variant">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-on-surface-variant">
                    No behavior events recorded.
                  </p>
                )}
              </div>
            ) : null}
          </section>
        </aside>

        <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
          <div className="flex flex-col gap-3 border-b border-outline-variant/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-headline text-xl font-semibold text-on-surface">
                Question review
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Review one answer at a time, then adjust scoring if needed.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="!w-auto px-3 py-2 text-sm"
                onClick={() => setQuestionPage((page) => Math.max(page - 1, 0))}
                disabled={questionPage === 0}
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <span className="rounded-lg bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface">
                {detail.questions.length > 0 ? questionPage + 1 : 0} /{" "}
                {detail.questions.length}
              </span>
              <Button
                type="button"
                variant="outline"
                className="!w-auto px-3 py-2 text-sm"
                onClick={() =>
                  setQuestionPage((page) =>
                    Math.min(page + 1, detail.questions.length - 1),
                  )
                }
                disabled={questionPage >= detail.questions.length - 1}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          {currentQuestion ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                      Question {questionPage + 1} / {detail.questions.length}
                    </p>
                    <h4 className="mt-2 font-headline text-lg font-semibold text-on-surface">
                      {currentQuestion.skill}
                    </h4>
                    <p className="mt-1 text-sm capitalize text-on-surface-variant">
                      {currentQuestion.type}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-container/15 px-3 py-1 text-sm font-semibold text-primary-container">
                    {formatPercent(currentQuestion.score)}
                  </span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-on-surface">
                  {currentQuestion.prompt}
                </p>
              </div>

              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Candidate answer
                </p>
                <p className="mt-3 min-h-32 whitespace-pre-wrap rounded-lg bg-surface-container-low p-4 text-sm leading-6 text-on-surface">
                  {getAnswerText(currentQuestion.answer) || "No answer provided"}
                </p>
              </div>

              {currentQuestion.feedback ? (
                <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    AI feedback
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface">
                    {currentQuestion.feedback}
                  </p>
                </div>
              ) : null}

              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
                <h4 className="font-headline text-lg font-semibold text-on-surface">
                  Admin question score
                </h4>
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={questionScores[currentQuestion.id] ?? ""}
                    onChange={(event) =>
                      setQuestionScores((current) => ({
                        ...current,
                        [currentQuestion.id]: event.target.value,
                      }))
                    }
                    className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
                    placeholder="0-100"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    loading={questionSaving === currentQuestion.id}
                    onClick={() => handleQuestionScoreSave(currentQuestion.id)}
                    className="!w-auto px-4 py-2 text-sm"
                  >
                    Save score
                  </Button>
                </div>
                <textarea
                  value={questionFeedback[currentQuestion.id] ?? ""}
                  onChange={(event) =>
                    setQuestionFeedback((current) => ({
                      ...current,
                      [currentQuestion.id]: event.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
                  placeholder="Admin feedback for this answer"
                />
              </div>
            </div>
          ) : (
            <p className="mt-6 text-on-surface-variant">No questions found.</p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
