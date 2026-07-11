import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";

export interface VerificationStatus {
  status: string; // profile_incomplete, email_verification_pending, id_verification_pending, cv_pending, assessment_pending, assessment_in_progress, assessment_submitted, interview_pending, approved, rejected
  isEmailVerified: boolean;
  isIdVerified: boolean;
  isProfileComplete: boolean;
  hasCvUploaded: boolean;
  assessmentId?: string;
  assessmentStatus?: string;
  rejectionReason?: string;
  canStartAssessment: boolean;
}

export async function getVerificationStatus(): Promise<VerificationStatus> {
  try {
    const { data } = await api.get<VerificationStatus>(API_ENDPOINTS.freelancerVerification.me);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load verification status"));
  }
}