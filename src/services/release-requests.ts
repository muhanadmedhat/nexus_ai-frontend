import { api, deliveryEndpoints, getApiErrorMessage } from "@/lib/api";
import {
  fixtureReleaseRequests,
  paginateFixture,
  deliveryFixturesEnabled,
} from "@/lib/fixtures/delivery";
import type { PaginatedResult } from "./project-submissions";
import type {
  PaymentReleaseRequest,
  ReleaseRequestStatus,
  TransferMode,
} from "@/types/delivery";

/**
 * Escrow release requests.
 *
 * Sprint 5 is ledger-only: an approved release writes an escrow ledger entry
 * with `{ transferMode: "ledger_only" }` and no Stripe transfer is attempted.
 * Live Connect transfers are Sprint 6.
 *
 * Do not use `releasePayment()` from payments.ts — that is the old direct
 * whole-payment endpoint the Sprint 5 contract replaces.
 */

interface ApiDataResponse<T> {
  status: string;
  data: T;
}

interface ApiPaginatedResponse<T> {
  status: string;
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface ReleaseRequestListParams {
  status?: ReleaseRequestStatus | string;
  milestoneId?: string;
  projectId?: string;
  freelancerProfileId?: string;
  page?: number;
  limit?: number;
}

export interface CreateReleaseRequestPayload {
  milestoneId?: string;
  submissionId: string;
  freelancerProfileId?: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface ReviewReleaseRequestPayload {
  decision: "approved" | "rejected";
  reviewNotes?: string;
  releaseNow?: boolean;
}

export interface EscrowLedgerEntry {
  id: string;
  projectId: string;
  entryType?: string;
  amount: string;
  currency: string;
  status?: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ReviewReleaseRequestResult {
  releaseRequest: PaymentReleaseRequest;
  ledgerEntry: EscrowLedgerEntry | null;
  stripeTransferId: string | null;
  transferMode: TransferMode;
}

function buildQuery(params?: ReleaseRequestListParams): string {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.milestoneId) query.append("milestoneId", params.milestoneId);
  if (params?.projectId) query.append("projectId", params.projectId);
  if (params?.freelancerProfileId) {
    query.append("freelancerProfileId", params.freelancerProfileId);
  }
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  return query.toString();
}

function toPaginated<T>(
  payload: ApiPaginatedResponse<T>,
  params?: { page?: number; limit?: number },
): PaginatedResult<T> {
  const items = Array.isArray(payload.data) ? payload.data : [];
  return {
    items,
    total: payload.total ?? items.length,
    page: payload.page ?? params?.page ?? 1,
    limit: payload.limit ?? params?.limit ?? items.length,
  };
}

export async function createReleaseRequest(
  projectId: string,
  payload: CreateReleaseRequestPayload,
): Promise<PaymentReleaseRequest> {
  if (deliveryFixturesEnabled()) {
    return {
      ...fixtureReleaseRequests[0],
      amount: payload.amount.toFixed(2),
      currency: payload.currency,
      reason: payload.reason ?? null,
      status: "pending",
    };
  }

  try {
    const { data } = await api.post<ApiDataResponse<PaymentReleaseRequest>>(
      deliveryEndpoints.releaseRequests.create(projectId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not create release request"));
  }
}

export async function listProjectReleaseRequests(
  projectId: string,
  params?: ReleaseRequestListParams,
): Promise<PaginatedResult<PaymentReleaseRequest>> {
  if (deliveryFixturesEnabled()) {
    const matching = fixtureReleaseRequests.filter(
      (request) => !params?.status || request.status === params.status,
    );
    return paginateFixture(matching, params?.page, params?.limit);
  }

  try {
    const query = buildQuery(params);
    const { data } = await api.get<ApiPaginatedResponse<PaymentReleaseRequest>>(
      `${deliveryEndpoints.releaseRequests.projectList(projectId)}${query ? `?${query}` : ""}`,
    );
    return toPaginated(data, params);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load release requests"));
  }
}

export async function listAdminReleaseRequests(
  params?: ReleaseRequestListParams,
): Promise<PaginatedResult<PaymentReleaseRequest>> {
  if (deliveryFixturesEnabled()) {
    const matching = fixtureReleaseRequests.filter(
      (request) => !params?.status || request.status === params.status,
    );
    return paginateFixture(matching, params?.page, params?.limit);
  }

  try {
    const query = buildQuery(params);
    const { data } = await api.get<ApiPaginatedResponse<PaymentReleaseRequest>>(
      `${deliveryEndpoints.releaseRequests.adminList}${query ? `?${query}` : ""}`,
    );
    return toPaginated(data, params);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load release requests"));
  }
}

export async function reviewReleaseRequest(
  requestId: string,
  payload: ReviewReleaseRequestPayload,
): Promise<ReviewReleaseRequestResult> {
  if (deliveryFixturesEnabled()) {
    const released = payload.decision === "approved" && payload.releaseNow === true;
    return {
      releaseRequest: {
        ...fixtureReleaseRequests[0],
        status: payload.decision === "rejected" ? "rejected" : released ? "released" : "approved",
        reviewNotes: payload.reviewNotes ?? null,
      },
      ledgerEntry: null,
      stripeTransferId: null,
      transferMode: "ledger_only",
    };
  }

  try {
    const { data } = await api.patch<ApiDataResponse<ReviewReleaseRequestResult>>(
      deliveryEndpoints.releaseRequests.review(requestId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not review release request"));
  }
}
