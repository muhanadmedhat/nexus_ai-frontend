import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";

export interface AssessmentQuestion {
  id: string;
  type: "multiple_choice" | "short_answer" | "practical";
  skill: string;
  difficulty: string;
  prompt: string;
  choices?: string[];
  orderIndex: number;
}

export interface Assessment {
  id: string;
  status: string; // pending, in_progress, submitted
  durationSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  questions: AssessmentQuestion[];
  remainingSeconds?: number;
}

export interface AnswerSubmit {
  questionId: string;
  answer: string | string[];
}

export interface AssessmentResult {
  status: string; // pending_review, passed, needs_review, failed
  score: number | null;
  feedback: string | null;
  recommendation: "pass" | "needs_review" | "fail" | null;
}

export async function startAssessment(): Promise<Assessment> {
  try {
    const { data } = await api.post<Assessment>(API_ENDPOINTS.freelancerAssessments.start);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to start assessment"));
  }
}

export async function getCurrentAssessment(): Promise<Assessment | null> {
  try {
    const { data } = await api.get<Assessment | null>(API_ENDPOINTS.freelancerAssessments.current);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load assessment"));
  }
}

export async function submitAnswer(assessmentId: string, payload: AnswerSubmit): Promise<void> {
  try {
    await api.post(API_ENDPOINTS.freelancerAssessments.answers(assessmentId), payload);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to submit answer"));
  }
}

export async function submitAssessment(assessmentId: string): Promise<AssessmentResult> {
  try {
    const { data } = await api.post<AssessmentResult>(API_ENDPOINTS.freelancerAssessments.submit(assessmentId));
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to submit assessment"));
  }
}

export async function logEvent(assessmentId: string, eventType: string, metadata?: any): Promise<void> {
  try {
    await api.post(API_ENDPOINTS.freelancerAssessments.events(assessmentId), {
      eventType,
      metadata,
    });
  } catch (error) {
    console.error("Failed to log assessment event", error);
  }
}