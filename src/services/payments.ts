import { api, sprint4Endpoints, getApiErrorMessage } from "@/lib/api";
import type { ProjectStatus } from "@/types/project";

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

export interface FreelancerDashboardLinkResult {
  accountId: string;
  url: string;
}

interface BackendFreelancerOnboardingResult {
  accountId: string;
  url?: string | null;
  onboardingUrl?: string | null;
}

export interface FreelancerAccountStatus {
  stripeAccountId: string | null;
  stripeOnboardingStatus: string;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeRequirementsDue: unknown;
  stripeOnboardedAt: string | null;
}

interface BackendFreelancerAccountStatus {
  accountId: string | null;
  onboardingStatus: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsDue: unknown;
  onboardedAt: string | null;
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

export interface ProjectPayment {
  id: string;
  projectId: string;
  milestoneId?: string | null;
  freelancerProfileId?: string | null;
  amount: number;
  currency: string;
  status: string;
  purpose: string;
  createdAt?: string;
  paidAt?: string | null;
}

interface BackendProjectPayment extends Omit<ProjectPayment, "amount"> {
  amount: number | string;
}

export interface ProjectPaymentMilestoneSummary {
  id: string;
  title: string;
  status: string;
  orderIndex: number;
  budgetAmount: number | null;
  currency: string | null;
  fundedAmount: number;
  remainingAmount: number | null;
  dueAt: string | null;
}

export interface ProjectPaymentSummary {
  project: {
    id: string;
    title: string;
    status: ProjectStatus;
    budgetMin: number | null;
    budgetMax: number | null;
    currency: string;
    deadline: string | null;
    createdAt: string;
  };
  quote: {
    amount: number | null;
    currency: string | null;
    status: string;
    generatedAt: string | null;
    notes: string | null;
    isOutOfBudget: boolean;
  };
  totals: {
    paidAmount: number;
    pendingAmount: number;
    remainingAmount: number | null;
    heldAmount: number;
    releasedAmount: number;
    currency: string;
  };
  actions: {
    canPay: boolean;
    payBlockedReason: string | null;
    suggestedPaymentAmount: number | null;
    suggestedPaymentPurpose?: string;
    payButtonLabel?: string;
  };
  milestones: ProjectPaymentMilestoneSummary[];
  payments: ProjectPayment[];
}

export interface CheckoutSessionResult {
  paymentId: string;
  projectId: string;
  checkoutSessionId: string;
  checkoutUrl: string | null;
  amount: number;
  currency: string;
  status: string;
  purpose: string;
}

export interface ReleasePaymentResult {
  id: string;
  status: string;
  releasedAt?: string | null;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function toPayment(payment: BackendProjectPayment): ProjectPayment {
  return {
    ...payment,
    amount: toNumber(payment.amount) ?? 0,
  };
}

function toSummary(summary: ProjectPaymentSummary): ProjectPaymentSummary {
  return {
    ...summary,
    quote: {
      ...summary.quote,
      amount: toNumber(summary.quote.amount),
    },
    totals: {
      ...summary.totals,
      paidAmount: toNumber(summary.totals.paidAmount) ?? 0,
      pendingAmount: toNumber(summary.totals.pendingAmount) ?? 0,
      heldAmount: toNumber(summary.totals.heldAmount) ?? 0,
      releasedAmount: toNumber(summary.totals.releasedAmount) ?? 0,
      remainingAmount: toNumber(summary.totals.remainingAmount),
    },
    milestones: summary.milestones.map((milestone) => ({
      ...milestone,
      budgetAmount: toNumber(milestone.budgetAmount),
      fundedAmount: toNumber(milestone.fundedAmount) ?? 0,
      remainingAmount: toNumber(milestone.remainingAmount),
    })),
    payments: summary.payments.map((payment) =>
      toPayment(payment as unknown as BackendProjectPayment),
    ),
  };
}

export async function createCustomerSetupIntent(payload: {
  returnUrl: string;
}) {
  try {
    const { data } = await api.post<ApiDataResponse<CustomerSetupIntentResult>>(
      sprint4Endpoints.payments.customerSetupIntent,
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not create setup intent"));
  }
}

export async function createFreelancerOnboardingLink(payload: {
  refreshUrl: string;
  returnUrl: string;
  country?: string;
}) {
  try {
    const { data } = await api.post<
      ApiDataResponse<BackendFreelancerOnboardingResult>
    >(sprint4Endpoints.payments.freelancerOnboardingLink, payload);
    const onboardingUrl = data.data.onboardingUrl ?? data.data.url ?? "";

    return {
      accountId: data.data.accountId,
      onboardingUrl,
    };
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not create onboarding link"),
    );
  }
}

export async function getFreelancerAccount() {
  try {
    const { data } = await api.get<
      ApiDataResponse<BackendFreelancerAccountStatus>
    >(sprint4Endpoints.payments.freelancerAccount);
    return {
      stripeAccountId: data.data.accountId,
      stripeOnboardingStatus: data.data.onboardingStatus,
      stripeChargesEnabled: data.data.chargesEnabled,
      stripePayoutsEnabled: data.data.payoutsEnabled,
      stripeRequirementsDue: data.data.requirementsDue,
      stripeOnboardedAt: data.data.onboardedAt,
    };
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load freelancer account status"),
    );
  }
}

export async function createFreelancerDashboardLink() {
  try {
    const { data } = await api.post<
      ApiDataResponse<FreelancerDashboardLinkResult>
    >(sprint4Endpoints.payments.freelancerDashboardLink);
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not open Stripe Dashboard"),
    );
  }
}

export async function createEscrowIntent(
  projectId: string,
  payload: {
    purpose: string;
    milestoneId?: string | null;
    amount: number;
    currency: string;
    metadata?: JsonObject;
  },
) {
  try {
    const { data } = await api.post<ApiDataResponse<EscrowIntentResult>>(
      sprint4Endpoints.payments.escrowIntent(projectId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not create escrow intent"),
    );
  }
}

export async function createEscrowCheckoutSession(
  projectId: string,
  payload: {
    purpose: string;
    milestoneId?: string | null;
    amount: number;
    currency: string;
  },
) {
  try {
    const { data } = await api.post<ApiDataResponse<CheckoutSessionResult>>(
      sprint4Endpoints.payments.checkoutSession(projectId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not start checkout"));
  }
}

export async function getCustomerPaymentProjects() {
  try {
    const { data } = await api.get<ApiDataResponse<ProjectPaymentSummary[]>>(
      sprint4Endpoints.payments.customerProjects,
    );
    return Array.isArray(data.data) ? data.data.map(toSummary) : [];
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load payment projects"),
    );
  }
}

export async function getProjectPaymentSummary(projectId: string) {
  try {
    const { data } = await api.get<ApiDataResponse<ProjectPaymentSummary>>(
      sprint4Endpoints.payments.projectSummary(projectId),
    );
    return toSummary(data.data);
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load payment summary"),
    );
  }
}

export async function getProjectPayments(projectId: string) {
  try {
    const { data } = await api.get<ApiDataResponse<BackendProjectPayment[]>>(
      sprint4Endpoints.payments.projectPayments(projectId),
    );
    return Array.isArray(data.data) ? data.data.map(toPayment) : [];
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load project payments"),
    );
  }
}

export async function releasePayment(
  projectId: string,
  paymentId: string,
  payload: {
    milestoneId?: string;
    freelancerProfileId?: string;
    amount: number;
    reason: string;
  },
) {
  try {
    const { data } = await api.post<ApiDataResponse<ReleasePaymentResult>>(
      sprint4Endpoints.payments.release(projectId, paymentId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not release payment"));
  }
}
