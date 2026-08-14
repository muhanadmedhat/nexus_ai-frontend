import { api, sprint5Endpoints, getApiErrorMessage } from "@/lib/api";
import {
  fixtureEvaluationRuns,
  fixtureReviews,
  fixtureRevisionRequests,
  fixtureSubmissions,
  paginateFixture,
  deliveryFixturesEnabled,
} from "@/lib/fixtures/delivery";
import type {
  EvaluationRun,
  PaymentReleaseRequest,
  ProjectRevisionRequest,
  ProjectSubmission,
  ProjectSubmissionReview,
  SubmissionContent,
  SubmissionFileUrls,
  SubmissionStatus,
  SubmissionType,
  RequestedChanges,
} from "@/types/delivery";

/**
 * Sprint 5 implementation-work submissions.
 *
 * Not to be confused with `planning.ts`, which handles Sprint 4 *planning*
 * submissions against /planning-submissions. Different table, different
 * lifecycle — hence the deliberately distinct function names here.
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

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SubmissionListParams {
  taskId?: string;
  milestoneId?: string;
  status?: SubmissionStatus | string;
  freelancerProfileId?: string;
  page?: number;
  limit?: number;
}

export interface CreateSubmissionPayload {
  taskId: string;
  milestoneId?: string;
  repositoryId?: string;
  submissionType?: SubmissionType;
  title?: string;
  summary?: string;
  content?: SubmissionContent;
  fileUrls?: SubmissionFileUrls;
  repoUrl?: string;
  branchName?: string;
  pullRequestUrl?: string;
  commitSha?: string;
  status?: Extract<SubmissionStatus, "draft" | "submitted">;
}

/**
 * Update accepts null so a freelancer can clear a field they filled in by
 * mistake. Omitting the key leaves the stored value untouched, so an empty
 * input must send null rather than undefined.
 */
export type UpdateSubmissionPayload = {
  [K in keyof Omit<CreateSubmissionPayload, "taskId">]?:
    | Omit<CreateSubmissionPayload, "taskId">[K]
    | null;
};

export interface ReviewSubmissionPayload {
  decision: "approved" | "changes_requested" | "rejected";
  feedback?: string;
  requestedChanges?: RequestedChanges;
  score?: number;
  createRevisionRequest?: boolean;
  releasePayment?: boolean;
}

/**
 * Detail response. The handoff names the contents but never the key names —
 * see R3 in sprint-5-issues.md — so the composite fields are optional until
 * Asaad confirms them.
 */
export interface SubmissionDetail extends ProjectSubmission {
  latestEvaluationRun?: EvaluationRun | null;
  evaluationRun?: EvaluationRun | null;
  reviews?: ProjectSubmissionReview[];
  revisionRequests?: ProjectRevisionRequest[];
  openRevisionRequests?: ProjectRevisionRequest[];
}

export interface ReviewSubmissionResult {
  submission: ProjectSubmission;
  review: ProjectSubmissionReview;
  revisionRequest: ProjectRevisionRequest | null;
  releaseRequest: PaymentReleaseRequest | null;
}

function toQuery(params?: SubmissionListParams): string {
  const query = new URLSearchParams();
  if (params?.taskId) query.append("taskId", params.taskId);
  if (params?.milestoneId) query.append("milestoneId", params.milestoneId);
  if (params?.status) query.append("status", params.status);
  if (params?.freelancerProfileId) {
    query.append("freelancerProfileId", params.freelancerProfileId);
  }
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  return query.toString();
}

function toPaginated<T>(payload: ApiPaginatedResponse<T>, params?: { page?: number; limit?: number }): PaginatedResult<T> {
  const items = Array.isArray(payload.data) ? payload.data : [];
  return {
    items,
    total: payload.total ?? items.length,
    page: payload.page ?? params?.page ?? 1,
    limit: payload.limit ?? params?.limit ?? items.length,
  };
}

export async function createDeliverySubmission(
  projectId: string,
  payload: CreateSubmissionPayload,
): Promise<ProjectSubmission> {
  if (deliveryFixturesEnabled()) return fixtureSubmissions[0];

  try {
    const { data } = await api.post<ApiDataResponse<ProjectSubmission>>(
      sprint5Endpoints.submissions.create(projectId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not create submission"));
  }
}

export async function listDeliverySubmissions(
  projectId: string,
  params?: SubmissionListParams,
): Promise<PaginatedResult<ProjectSubmission>> {
  if (deliveryFixturesEnabled()) {
    const matching = fixtureSubmissions.filter(
      (submission) =>
        (!params?.taskId || submission.taskId === params.taskId) &&
        (!params?.status || submission.status === params.status),
    );
    return paginateFixture(matching, params?.page, params?.limit);
  }

  try {
    const query = toQuery(params);
    const { data } = await api.get<ApiPaginatedResponse<ProjectSubmission>>(
      `${sprint5Endpoints.submissions.projectList(projectId)}${query ? `?${query}` : ""}`,
    );
    return toPaginated(data, params);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load submissions"));
  }
}

export async function getDeliverySubmission(submissionId: string): Promise<SubmissionDetail> {
  if (deliveryFixturesEnabled()) {
    const submission = fixtureSubmissions.find((item) => item.id === submissionId) ?? fixtureSubmissions[0];
    return {
      ...submission,
      latestEvaluationRun:
        fixtureEvaluationRuns.find((run) => run.submissionId === submission.id) ?? null,
      reviews: fixtureReviews.filter((review) => review.submissionId === submission.id),
      openRevisionRequests: fixtureRevisionRequests.filter(
        (revision) => revision.submissionId === submission.id && revision.status !== "resolved",
      ),
    };
  }

  try {
    const { data } = await api.get<ApiDataResponse<SubmissionDetail>>(
      sprint5Endpoints.submissions.detail(submissionId),
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load submission"));
  }
}

export async function updateDeliverySubmission(
  submissionId: string,
  payload: UpdateSubmissionPayload,
): Promise<ProjectSubmission> {
  if (deliveryFixturesEnabled()) return { ...fixtureSubmissions[0], ...payload } as ProjectSubmission;

  try {
    const { data } = await api.patch<ApiDataResponse<ProjectSubmission>>(
      sprint5Endpoints.submissions.update(submissionId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not save submission"));
  }
}

export async function submitDeliverySubmission(
  submissionId: string,
  payload?: { summary?: string },
): Promise<ProjectSubmission> {
  if (deliveryFixturesEnabled()) return { ...fixtureSubmissions[0], status: "submitted" };

  try {
    const { data } = await api.post<ApiDataResponse<ProjectSubmission>>(
      sprint5Endpoints.submissions.submit(submissionId),
      payload ?? {},
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not submit for review"));
  }
}

export async function reviewDeliverySubmission(
  submissionId: string,
  payload: ReviewSubmissionPayload,
): Promise<ReviewSubmissionResult> {
  if (deliveryFixturesEnabled()) {
    return {
      submission: { ...fixtureSubmissions[0], status: "approved" },
      review: fixtureReviews[0],
      revisionRequest: null,
      releaseRequest: null,
    };
  }

  try {
    const { data } = await api.patch<ApiDataResponse<ReviewSubmissionResult>>(
      sprint5Endpoints.submissions.review(submissionId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not submit review"));
  }
}
