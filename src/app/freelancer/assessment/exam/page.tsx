"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Clock, Check, Send, Maximize2 } from "lucide-react";
import { clsx } from "clsx";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getCurrentAssessment,
  saveAnswers,
  submitAssessment,
  trackEvent,
} from "@/services/assessments";
import type {
  AnswerInput,
  AssessmentAnswerValue,
  AssessmentEventType,
  AssessmentQuestion,
  AssessmentSummary,
} from "@/types/assessment";

const AUTOSAVE_DELAY_MS = 700;

type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

function answerText(a: AssessmentAnswerValue | undefined): string {
  return a && "value" in a && typeof a.value === "string" ? a.value : "";
}
function answerChoice(a: AssessmentAnswerValue | undefined): string {
  return a && "choiceId" in a && typeof a.choiceId === "string" ? a.choiceId : "";
}
function isAnswered(a: AssessmentAnswerValue | undefined): boolean {
  return Boolean(answerText(a).trim() || answerChoice(a));
}
function fmtTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function toPayload(answers: Record<string, AssessmentAnswerValue>): AnswerInput[] {
  return Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
}

export default function ExamPage() {
  const router = useRouter();
  const [assessment, setAssessment] = useState<AssessmentSummary | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AssessmentAnswerValue>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const idRef = useRef<string | null>(null);
  const answersRef = useRef(answers);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // ---- load the in-progress assessment ----
  useEffect(() => {
    getCurrentAssessment()
      .then((res) => {
        if (!res.assessment || res.assessment.status !== "in_progress") {
          router.replace("/freelancer/assessment");
          return;
        }
        idRef.current = res.assessment.id;
        setAssessment(res.assessment);
        setQuestions([...res.questions].sort((a, b) => a.orderIndex - b.orderIndex));
        const initial: Record<string, AssessmentAnswerValue> = {};
        for (const saved of res.answers) initial[saved.questionId] = saved.answer;
        setAnswers(initial);
        if (res.assessment.expiresAt) {
          const left = Math.max(
            0,
            Math.floor((new Date(res.assessment.expiresAt).getTime() - Date.now()) / 1000),
          );
          setRemaining(left);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the assessment"))
      .finally(() => setLoading(false));
  }, [router]);

  const logEvent = useCallback((eventType: AssessmentEventType) => {
    const id = idRef.current;
    if (!id) return;
    trackEvent(id, eventType, { occurredAt: new Date().toISOString() }).catch(() => {});
  }, []);

  const persist = useCallback(async () => {
    const id = idRef.current;
    const payload = toPayload(answersRef.current);
    if (!id || payload.length === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSaveStatus("offline");
      return;
    }
    setSaveStatus("saving");
    try {
      await saveAnswers(id, payload, true);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, []);

  const doSubmit = useCallback(
    async (reason: "manual_submit" | "timer_expired") => {
      const id = idRef.current;
      if (!id || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        await submitAssessment(id, { finalAnswers: toPayload(answersRef.current), reason });
        router.replace("/freelancer/assessment/result");
      } catch (err) {
        submittedRef.current = false;
        setSubmitting(false);
        setConfirmOpen(false);
        setError(err instanceof Error ? err.message : "Could not submit the assessment");
      }
    },
    [router],
  );

  // Leaving the exam page submits it as-is, then continues to the target page.
  async function leaveAndSubmit(href: string) {
    const id = idRef.current;
    if (id && !submittedRef.current) {
      submittedRef.current = true;
      setSubmitting(true);
      try {
        await submitAssessment(id, {
          finalAnswers: toPayload(answersRef.current),
          reason: "manual_submit",
        });
      } catch {
        // answers are autosaved; leave regardless
      }
    }
    router.push(href);
  }

  // ---- timer (computed from server expiresAt), auto-submit at zero ----
  useEffect(() => {
    if (!assessment?.expiresAt) return;
    const expiry = new Date(assessment.expiresAt).getTime();
    const iv = setInterval(() => {
      const left = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !submittedRef.current) {
        logEvent("timer_expired");
        void doSubmit("timer_expired");
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [assessment?.expiresAt, logEvent, doSubmit]);

  // ---- anti-cheat: record focus / tab / fullscreen / copy-paste ----
  useEffect(() => {
    const warn = (type: AssessmentEventType) => {
      logEvent(type);
      setWarnings((w) => w + 1);
      setShowWarning(true);
    };
    const onVisibility = () =>
      document.hidden ? warn("visibility_hidden") : logEvent("visibility_visible");
    const onBlur = () => warn("focus_lost");
    const onFocus = () => logEvent("focus_returned");
    const onCopy = () => logEvent("copy_attempt");
    const onPaste = () => logEvent("paste_attempt");
    const onFsChange = () => {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
      if (fs) logEvent("fullscreen_enter");
      else warn("fullscreen_exit");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, [logEvent]);

  // ---- autosave "Offline" state + retry when the connection returns ----
  useEffect(() => {
    const onOffline = () => setSaveStatus("offline");
    const onOnline = () => void persist();
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [persist]);

  // ---- switching pages during the exam warns, then submits it as-is (no resume) ----
  useEffect(() => {
    if (!assessment) return;
    const onDocClick = (e: MouseEvent) => {
      if (submittedRef.current) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("/freelancer/assessment/exam")) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
    };
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [assessment]);

  function setAnswer(questionId: string, value: AssessmentAnswerValue, immediate = false) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (immediate) void persist();
    else saveTimer.current = setTimeout(() => void persist(), AUTOSAVE_DELAY_MS);
  }

  function goTo(index: number) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void persist(); // save immediately when switching questions
    setCurrent(index);
  }

  function openSubmit() {
    logEvent("manual_submit_click");
    setConfirmOpen(true);
  }

  function enterFullscreen() {
    document.documentElement.requestFullscreen().catch(() => {});
  }

  if (loading) {
    return (
      <DashboardShell role="freelancer" title="Assessment">
        <div className="flex items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 card-shadow">
          <Loader2 size={20} className="animate-spin text-on-surface-variant" />
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell role="freelancer" title="Assessment">
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center card-shadow">
          <AlertCircle size={22} className="mx-auto mb-3 text-error" />
          <p className="text-sm text-error">{error}</p>
        </div>
      </DashboardShell>
    );
  }

  const q = questions[current];
  const answeredCount = questions.filter((item) => isAnswered(answers[item.id])).length;
  const lowTime = remaining <= 60;

  return (
    <DashboardShell role="freelancer" title="Skills assessment">
      {!isFullscreen ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95 p-6 text-center backdrop-blur-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container/15">
            <Maximize2 size={26} className="text-primary-container" />
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface">
              This assessment runs in fullscreen
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-on-surface-variant">
              Enter fullscreen to continue. Leaving fullscreen is recorded for reviewers.
            </p>
          </div>
          <Button onClick={enterFullscreen} className="w-auto px-5 py-2.5">
            <Maximize2 size={16} /> Enter fullscreen
          </Button>
        </div>
      ) : null}

      <div className="sticky top-16 z-10 mb-4 flex items-center justify-between gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 card-shadow">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium tabular-nums",
              lowTime ? "bg-error/10 text-error" : "bg-surface-container-high text-on-surface",
            )}
          >
            <Clock size={16} /> {fmtTime(remaining)}
          </span>
          <span className="text-on-surface-variant">
            {answeredCount}/{questions.length} answered
          </span>
          <SaveIndicator status={saveStatus} />
          {warnings > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-error/10 px-2 py-1 text-xs font-medium text-error">
              <AlertCircle size={13} /> {warnings}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={openSubmit}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary-container px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary active:scale-[0.98]"
        >
          <Send size={16} /> Submit
        </button>
      </div>

      {showWarning ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-error/30 bg-error/10 px-4 py-2.5 text-sm text-error">
          <span>Leaving the tab or fullscreen is recorded for reviewers. ({warnings})</span>
          <button
            onClick={() => setShowWarning(false)}
            className="shrink-0 text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {questions.map((item, i) => {
          const answered = isAnswered(answers[item.id]);
          return (
            <button
              key={item.id}
              onClick={() => goTo(i)}
              aria-label={`Question ${i + 1}${answered ? " (answered)" : ""}`}
              className={clsx(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                i === current
                  ? "border-primary-container bg-primary-container text-on-primary"
                  : answered
                    ? "border-primary-container/40 bg-primary-container/15 text-primary-container"
                    : "border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {q ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
          <div className="mb-2 flex items-center gap-2 text-xs text-on-surface-variant">
            {q.skill ? (
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-medium">{q.skill}</span>
            ) : null}
            <span>
              Question {current + 1} of {questions.length}
            </span>
          </div>
          <p className="mb-4 whitespace-pre-wrap text-on-surface">{q.prompt}</p>

          {q.questionType === "multiple_choice" && q.choices ? (
            <div className="space-y-2">
              {q.choices.map((c) => {
                const selected = answerChoice(answers[q.id]) === c.id;
                return (
                  <label
                    key={c.id}
                    className={clsx(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                      selected
                        ? "border-primary-container bg-primary-container/10 text-on-surface"
                        : "border-outline-variant/40 hover:bg-surface-container-low",
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={selected}
                      onChange={() => setAnswer(q.id, { choiceId: c.id }, true)}
                      className="accent-primary-container"
                    />
                    {c.label}
                  </label>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answerText(answers[q.id])}
              onChange={(e) => setAnswer(q.id, { value: e.target.value })}
              onBlur={() => void persist()}
              rows={q.questionType === "scenario" ? 8 : 4}
              placeholder="Type your answer…"
              className="input-halo w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface outline-none"
            />
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => goTo(Math.max(0, current - 1))}
              disabled={current === 0}
              className="w-auto px-4 py-2"
            >
              Previous
            </Button>
            {current < questions.length - 1 ? (
              <Button variant="outline" onClick={() => goTo(current + 1)} className="w-auto px-4 py-2">
                Next
              </Button>
            ) : (
              <Button onClick={openSubmit} className="w-auto px-4 py-2">
                Review &amp; submit
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Submit assessment?"
        description={`You've answered ${answeredCount} of ${questions.length} questions. You can't change your answers after submitting.`}
        confirmLabel="Submit"
        cancelLabel="Keep working"
        loading={submitting}
        onConfirm={() => void doSubmit("manual_submit")}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={pendingHref !== null}
        title="Leave the assessment?"
        description="If you leave this page, your assessment is submitted as-is — you can't come back to finish it."
        confirmLabel="Leave & submit"
        cancelLabel="Stay on the assessment"
        danger
        loading={submitting}
        onConfirm={() => {
          if (pendingHref) void leaveAndSubmit(pendingHref);
        }}
        onCancel={() => setPendingHref(null)}
      />
    </DashboardShell>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const map = {
    saving: { text: "Saving…", cls: "text-on-surface-variant" },
    saved: { text: "Saved", cls: "text-primary-container" },
    error: { text: "Couldn't save", cls: "text-error" },
    offline: { text: "Offline", cls: "text-secondary" },
  } as const;
  const s = map[status];
  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs", s.cls)}>
      {status === "saved" ? <Check size={14} /> : null}
      {s.text}
    </span>
  );
}
