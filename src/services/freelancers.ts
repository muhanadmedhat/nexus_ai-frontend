import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";

export interface FreelancerProfile {
  id: string;
  userId: string;
  headline: string | null;
  bio: string | null;
  skills: string[] | null;
  yearsExperience: number | null;
  hourlyRate: number | null;
  isAvailable: boolean | null;
  cvUrl: string | null;
  photoUrl: string | null;
  verificationStatus: string;
  assessmentScore: number | null;
  assessmentSubmittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export interface UpdateFreelancerProfileInput {
  headline?: string;
  bio?: string;
  skills?: string[];
  yearsExperience?: number;
  hourlyRate?: number;
  isAvailable?: boolean;
}

export async function getFreelancerProfile(): Promise<FreelancerProfile | null> {
  try {
    const { data } = await api.get<FreelancerProfile>(API_ENDPOINTS.freelancers.me);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load freelancer profile"));
  }
}

export async function updateFreelancerProfile(input: UpdateFreelancerProfileInput): Promise<FreelancerProfile> {
  try {
    const { data } = await api.patch<FreelancerProfile>(API_ENDPOINTS.freelancers.me, input);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to update freelancer profile"));
  }
}