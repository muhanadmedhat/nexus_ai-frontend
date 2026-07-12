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
