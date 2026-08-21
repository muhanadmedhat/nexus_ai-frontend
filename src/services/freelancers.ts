import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";

export interface FreelancerProfile {
  id: string;
  cvUrl: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[] | null;
  yearsExperience: number | null;
  summary: Record<string, unknown> | null;
  hourlyRate: string | null;
  isAvailable: boolean;
  availabilityHoursPerWeek: number | null;
  githubUsername: string | null;
  skillScores?: FreelancerSkillScore[];
  verificationStatus?: string;
  assessmentScore?: string | null;
  principalReviewerStatus:
    "not_applied" | "pending" | "approved" | "rejected" | "suspended";
  principalReviewerAppliedAt: string | null;
  principalReviewerReviewedAt: string | null;
  principalReviewerRejectionReason: string | null;
  principalReviewerHourlyRate: string | null;
  principalReviewerMaxProjects: number;
  principalReviewerActiveProjects: number;
  principalReviewerEligibility: PrincipalReviewerEligibility;
}

export interface PrincipalReviewerEligibility {
  eligibleToApply: boolean;
  requirements: {
    baseProfileApproved: boolean;
    minimumExperienceYears: number;
    yearsExperience: number;
    minimumAssessmentScore: number;
    assessmentScore: number;
    minimumPerformanceScore: number;
    performanceScore: number;
    minimumQualifiedSkills: number;
    minimumSkillScore: number;
    qualifiedSkills: Array<{ skill: string; score: number | null }>;
    declaredRelevantSkills: string[];
    noRiskFlags: boolean;
  };
  gaps: string[];
}

export interface FreelancerSkillScore {
  id: string;
  skill: string;
  score: string;
  confidence: string | null;
  evidence: string | null;
}

export interface UpdateFreelancerProfileInput {
  headline?: string;
  bio?: string;
  skills?: string[];
  yearsExperience?: number;
  availabilityHoursPerWeek?: number;
  githubUsername?: string;
}

interface FreelancerProfileResponse {
  status: string;
  profile: FreelancerProfile;
}

export async function getMyFreelancerProfile(): Promise<FreelancerProfile> {
  try {
    const { data } = await api.get<FreelancerProfileResponse>(
      API_ENDPOINTS.freelancers.me,
    );
    return data.profile;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load freelancer profile"),
    );
  }
}

export async function updateMyFreelancerProfile(
  input: UpdateFreelancerProfileInput,
): Promise<FreelancerProfile> {
  try {
    const { data } = await api.patch<FreelancerProfileResponse>(
      API_ENDPOINTS.freelancers.me,
      input,
    );
    return data.profile;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not update freelancer profile"),
    );
  }
}

export async function applyForPrincipalReviewer(
  statement?: string,
): Promise<FreelancerProfile> {
  try {
    const { data } = await api.post<FreelancerProfileResponse>(
      API_ENDPOINTS.freelancers.principalReviewerApplication,
      statement?.trim() ? { statement: statement.trim() } : {},
    );
    return data.profile;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Could not submit principal reviewer application",
      ),
    );
  }
}

export async function withdrawPrincipalReviewerApplication(): Promise<FreelancerProfile> {
  try {
    const { data } = await api.delete<FreelancerProfileResponse>(
      API_ENDPOINTS.freelancers.principalReviewerApplication,
    );
    return data.profile;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Could not withdraw principal reviewer application",
      ),
    );
  }
}
