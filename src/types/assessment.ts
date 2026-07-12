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

export type QuestionType = "multiple_choice" | "short_answer" | "scenario";

export type AssessmentEventType =
  | "fullscreen_enter"
  | "fullscreen_exit"
  | "focus_lost"
  | "focus_returned"
  | "visibility_hidden"
  | "visibility_visible"
  | "copy_attempt"
  | "paste_attempt"
  | "timer_expired"
  | "manual_submit_click"
  | "autosave_failed";

export type SubmitReason = "manual_submit" | "timer_expired";

/** Candidate-safe answer payload. Never carries rubrics or correct answers. */
export type AssessmentAnswerValue =
  | { value: string }
  | { choiceId: string }
  | Record<string, unknown>;

export interface AssessmentChoice {
  id: string;
  label: string;
}

export interface AssessmentQuestion {
  id: string;
  questionType: QuestionType;
  skill: string | null;
  difficulty: string | null;
  prompt: string;
  choices: AssessmentChoice[] | null;
  orderIndex: number;
}

export interface AssessmentSummary {
  id: string;
  status: AssessmentStatus;
  score: string | null;
  durationSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  remainingSeconds?: number;
  questionCount?: number;
}

export interface AntiCheatConfig {
  trackFocusLoss: boolean;
  trackCopyPaste: boolean;
  requireFullscreen: boolean;
}

export interface SavedAnswer {
  questionId: string;
  answer: AssessmentAnswerValue;
  updatedAt: string;
}

export interface AssessmentEventsSummary {
  total: number;
  focusLost: number;
  fullscreenExit: number;
  byType?: Record<string, number>;
}

export interface VerificationChecklist {
  userId: string;
  profileId: string;
  verificationStatus: VerificationStatus;
  profileComplete: boolean;
  emailVerified: boolean;
  cvUploaded: boolean;
  cvExtracted: boolean;
  nextAction: NextAction | null;
  assessment: AssessmentSummary | null;
  missing: string[];
}

export interface StartAssessmentInput {
  questionCount?: number;
  durationSeconds?: number;
}

export interface StartAssessmentResult {
  assessment: AssessmentSummary;
  questions: AssessmentQuestion[];
  antiCheat: AntiCheatConfig;
}

export interface CurrentAssessmentResult {
  assessment: AssessmentSummary | null;
  questions: AssessmentQuestion[];
  answers: SavedAnswer[];
  eventsSummary?: AssessmentEventsSummary;
  nextAction: NextAction | null;
}

export interface AnswerInput {
  questionId: string;
  answer: AssessmentAnswerValue;
}

export interface SaveAnswersResult {
  answers: SavedAnswer[];
}

export interface AssessmentQuestionResult {
  questionId: string;
  score: number;
  feedback: string;
}

export interface SubmitAssessmentResult {
  assessment: Pick<AssessmentSummary, "id" | "status" | "score" | "submittedAt">;
  result: {
    recommendation: "pass" | "needs_review" | "fail" | null;
    feedback: string | null;
    questionResults: AssessmentQuestionResult[];
  };
  nextAction: NextAction | null;
}

export interface TrackEventResult {
  id: string;
  eventType: AssessmentEventType;
  createdAt: string;
}
