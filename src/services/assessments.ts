import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";

export type VerificationStatus =
  | "profile_incomplete"
  | "email_verification_pending"
  | "id_verification_pending"
  | "cv_pending"
  | "cv_processing"
  | "assessment_pending"
  | "assessment_in_progress"
  | "assessment_submitted"
  | "interview_pending"
  | "approved"
  | "rejected";

export type NextAction =
  | "complete_profile"
  | "verify_email"
  | "upload_cv"
  | "wait_for_cv_extraction"
  | "start_assessment"
  | "continue_assessment"
  | "wait_for_review"
  | "approved"
  | "rejected";

export type AssessmentStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "graded"
  | "needs_review"
  | "passed"
  | "failed"
  | "expired"
  | "cancelled";

export interface VerificationAssessment {
  id: string;
  status: AssessmentStatus;
  score: string | null;
  durationSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
}

export interface Verification {
  userId: string;
  profileId: string;
  verificationStatus: VerificationStatus;
  profileComplete: boolean;
  emailVerified: boolean;
  cvUploaded: boolean;
  cvExtracted: boolean;
  nextAction: NextAction;
  assessment: VerificationAssessment | null;
  missing: string[];
}

interface ApiDataResponse<T> {
  status: string;
  data: T;
}

export async function getVerification(): Promise<Verification> {
  try {
    const { data } = await api.get<ApiDataResponse<Verification>>(
      API_ENDPOINTS.freelancerVerification.me,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load verification status"));
  }
}

export interface AssessmentQuestionChoice {
  id: string;
  label: string;
}

export interface AssessmentQuestion {
  id: string;
  questionType: "multiple_choice" | "short_answer" | "scenario";
  skill: string;
  difficulty: string;
  prompt: string;
  choices: AssessmentQuestionChoice[] | null;
  orderIndex: number;
}

export interface AntiCheatConfig {
  trackFocusLoss: boolean;
  trackCopyPaste: boolean;
  requireFullscreen: boolean;
}

export interface AssessmentSession {
  id: string;
  status: AssessmentStatus;
  durationSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  remainingSeconds?: number;
  questionCount?: number;
}

export interface StartAssessmentResult {
  assessment: AssessmentSession;
  questions: AssessmentQuestion[];
  antiCheat: AntiCheatConfig;
}

export async function startAssessment(
  input: { questionCount?: number; durationSeconds?: number } = {},
): Promise<StartAssessmentResult> {
  try {
    const { data } = await api.post<ApiDataResponse<StartAssessmentResult>>(
      API_ENDPOINTS.freelancerAssessments.start,
      input,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not start assessment"));
  }
}

// Skills for the "skills tested" panel come from the freelancer profile.
// Returns [] on failure since skills are supplementary to the lobby.
export async function getMySkills(): Promise<string[]> {
  try {
    const { data } = await api.get<{ status: string; profile: { skills: string[] | null } }>(
      API_ENDPOINTS.freelancers.me,
    );
    return data.profile?.skills ?? [];
  } catch {
    return [];
  }
}
