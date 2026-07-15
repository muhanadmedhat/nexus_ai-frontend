import { api, sprint4Endpoints, getApiErrorMessage } from "@/lib/api";

type JsonObject = Record<string, unknown>;

interface ApiDataResponse<T> {
  status: string;
  data: T;
}

export interface CustomerSetupIntentResult {
  customerId: string;
  clientSecret: string;
}

export interface FreelancerOnboardingResult {
  accountId: string;
  onboardingUrl: string;
}

export interface FreelancerAccountStatus {
  stripeAccountId: string;
  stripeOnboardingStatus: string;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeRequirementsDue: string[];
  stripeOnboardedAt: string | null;
}

export interface EscrowIntentResult {
  paymentId: string;
  projectId: string;
  stripePaymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  purpose: string;
}

export async function createCustomerSetupIntent(payload: { returnUrl: string }) {
  try {
    const { data } = await api.post<ApiDataResponse<CustomerSetupIntentResult>>(
      sprint4Endpoints.payments.customerSetupIntent,
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not create setup intent"));
  }
}

export async function createFreelancerOnboardingLink(payload: { refreshUrl: string; returnUrl: string }) {
  try {
    const { data } = await api.post<ApiDataResponse<FreelancerOnboardingResult>>(
      sprint4Endpoints.payments.freelancerOnboardingLink,
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not create onboarding link"));
  }
}

export async function getFreelancerAccount() {
  try {
    const { data } = await api.get<ApiDataResponse<FreelancerAccountStatus>>(
      sprint4Endpoints.payments.freelancerAccount
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load freelancer account status"));
  }
}

export async function createEscrowIntent(
  projectId: string,
  payload: { purpose: string; milestoneId?: string | null; amount: number; currency: string; metadata?: JsonObject }
) {
  try {
    const { data } = await api.post<ApiDataResponse<EscrowIntentResult>>(
      sprint4Endpoints.payments.escrowIntent(projectId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not create escrow intent"));
  }
}

export async function getProjectPayments(projectId: string) {
  try {
    const { data } = await api.get<any>(
      sprint4Endpoints.payments.projectPayments(projectId)
    );
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load project payments"));
  }
}

export async function releasePayment(
  projectId: string,
  paymentId: string,
  payload: { milestoneId?: string; freelancerProfileId?: string; amount: number; reason: string }
) {
  try {
    const { data } = await api.post<ApiDataResponse<any>>(
      sprint4Endpoints.payments.release(projectId, paymentId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not release payment"));
  }
}
