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
  skillScores?: FreelancerSkillScore[];
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
    throw new Error(getApiErrorMessage(error, "Could not load freelancer profile"));
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
    throw new Error(getApiErrorMessage(error, "Could not update freelancer profile"));
  }
}
