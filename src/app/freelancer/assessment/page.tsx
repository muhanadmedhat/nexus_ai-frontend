"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  getCurrentAssessment,
  submitAnswer,
  submitAssessment,
  logEvent,
  type Assessment,
  type AssessmentQuestion,
  type AnswerSubmit,
} from "@/services/assessment";

export default function FreelancerAssessmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [warnings, setWarnings] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  // Load assessment
  useEffect(() => {
    const loadAssessment = async () => {
      try {
        const data = await getCurrentAssessment();
        if (!data) {
          router.replace("/freelancer/verification");
          return;
        }
        setAssessment(data);
        const initialAnswers: Record<string, string | string[]> = {};
        data.questions.forEach((q) => {
          initialAnswers[q.id] = "";
        });
        setAnswers(initialAnswers);

        if (data.expiresAt) {
          const remaining = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
          setRemainingTime(remaining);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load assessment");
      } finally {
        setLoading(false);
      }
    };

    loadAssessment();
  }, [router]);

  // Timer countdown
  useEffect(() => {
    if (remainingTime === null || remainingTime <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remainingTime]);

  // Fullscreen mode
  useEffect(() => {
    const enterFullscreen = async () => {
      if (fullscreenRef.current && !document.fullscreenElement) {
        try {
          await fullscreenRef.current.requestFullscreen();
          setIsFullscreen(true);
          await logEvent(assessment?.id || "", "fullscreen_entered");
        } catch (err) {
          console.warn("Fullscreen not allowed", err);
        }
      }
    };

    if (assessment && assessment.status === "in_progress") {
      enterFullscreen();
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [assessment]);

  // Detect tab switch / focus loss
  useEffect(() => {
    if (!assessment || assessment.status !== "in_progress") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarnings((prev) => prev + 1);
        logEvent(assessment.id, "tab_switch", { count: warnings + 1 });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [assessment, warnings]);

  // Prevent copy/paste
  useEffect(() => {
    if (!assessment || assessment.status !== "in_progress") return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent(assessment.id, "copy_attempt");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent(assessment.id, "paste_attempt");
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [assessment]);

  const handleAutoSubmit = useCallback(async () => {
    if (!assessment) return;
    try {
      await logEvent(assessment.id, "auto_submit");
      await submitAssessment(assessment.id);
      router.push("/freelancer/assessment/result");
    } catch (err) {
      console.error("Auto-submit failed", err);
    }
  }, [assessment, router]);

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (assessment) {
      const payload: AnswerSubmit = { questionId, answer: value };
      submitAnswer(assessment.id, payload).catch(() => {
        // Silently fail for auto-save
      });
    }
  };

  const handleSubmit = async () => {
    if (!assessment) return;
    const allAnswered = assessment.questions.every((q) => {
      const answer = answers[q.id];
      return answer && (Array.isArray(answer) ? answer.length > 0 : answer.trim().length > 0);
    });

    if (!allAnswered) {
      setError("Please answer all questions before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await logEvent(assessment.id, "manual_submit");
      await submitAssessment(assessment.id);
      router.push("/freelancer/assessment/result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <AlertCircle className="h-12 w-12 text-error" />
        <p className="mt-4 text-error">{error || "Assessment not found"}</p>
        <Button onClick={() => router.push("/freelancer/verification")} className="mt-4">
          Back to Verification
        </Button>
      </div>
    );
  }

  if (assessment.status === "submitted") {
    router.replace("/freelancer/assessment/result");
    return null;
  }

  const timeRemaining = remainingTime !== null ? formatTime(remainingTime) : "--:--";
  const isTimeUp = remainingTime !== null && remainingTime <= 0;

  return (
    <div ref={fullscreenRef} className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-surface-container-lowest border-b border-outline-variant/30 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-on-surface">Assessment</h1>
            {!isFullscreen && (
              <Button
                variant="outline"
                className="text-sm px-3 py-1.5"
                onClick={() => {
                  if (fullscreenRef.current) {
                    fullscreenRef.current.requestFullscreen();
                  }
                }}
              >
                Enter Fullscreen
              </Button>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-on-surface-variant" />
              <span className={`font-mono text-lg font-bold ${remainingTime && remainingTime < 60 ? "text-error" : "text-on-surface"}`}>
                {timeRemaining}
              </span>
            </div>
            {warnings > 0 && (
              <span className="text-xs text-error">
                ⚠️ {warnings} warning{warnings > 1 ? "s" : ""}
              </span>
            )}
            <Button
              className="text-sm px-3 py-1.5"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || isTimeUp}
            >
              <Send size={16} className="mr-2" />
              Submit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {assessment.questions.map((question, index) => (
            <QuestionItem
              key={question.id}
              question={question}
              index={index}
              value={answers[question.id] || ""}
              onChange={handleAnswerChange}
              disabled={isTimeUp}
            />
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || isTimeUp}
            className="px-8"
          >
            Submit Assessment
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-error-container/10 border border-error/30 p-4 text-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// Question item component
function QuestionItem({
  question,
  index,
  value,
  onChange,
  disabled,
}: {
  question: AssessmentQuestion;
  index: number;
  value: string | string[];
  onChange: (id: string, value: string | string[]) => void;
  disabled: boolean;
}) {
  const isAnswered = value && (Array.isArray(value) ? value.length > 0 : value.trim().length > 0);

  return (
    <div className={`rounded-lg border p-6 ${isAnswered ? "border-primary-container/50" : "border-outline-variant"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-container/10 text-sm font-semibold text-primary-container">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-on-surface">{question.type.replace("_", " ")}</span>
          <span className="text-xs text-on-surface-variant">• {question.skill}</span>
        </div>
        {isAnswered && <CheckCircle size={18} className="text-primary-container" />}
      </div>

      <p className="mb-4 text-base text-on-surface">{question.prompt}</p>

      {question.type === "multiple_choice" && question.choices && (
        <div className="space-y-2">
          {question.choices.map((choice, ci) => (
            <label key={ci} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name={question.id}
                value={choice}
                checked={value === choice}
                onChange={() => onChange(question.id, choice)}
                disabled={disabled}
                className="h-4 w-4 accent-primary-container"
              />
              <span className="text-sm text-on-surface">{choice}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === "short_answer" && (
        <input
          type="text"
          value={value as string || ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          disabled={disabled}
          placeholder="Type your answer..."
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface placeholder:text-outline/50 focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container transition"
        />
      )}

      {question.type === "practical" && (
        <textarea
          value={value as string || ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          disabled={disabled}
          rows={4}
          placeholder="Describe your solution..."
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface placeholder:text-outline/50 focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container transition resize-y"
        />
      )}
    </div>
  );
}