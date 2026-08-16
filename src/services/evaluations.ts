import { api, deliveryEndpoints, getApiErrorMessage } from "@/lib/api";

export type EvaluationRunStatus =
  "queued" | "running" | "completed" | "failed" | "cancelled" | "superseded";

export type EvaluationRecommendation =
  "approve" | "changes_requested" | "reject" | "manual_review";

export interface EvaluationRubricItem {
  key?: string;
  criterion: string;
  category?: string;
  status?: "met" | "not_applicable" | "unmet";
  met: boolean;
  evidence: string;
}

export interface EvaluationRun {
  id: string;
  projectId: string;
  submissionId: string | null;
  taskId: string | null;
  milestoneId: string | null;
  status: EvaluationRunStatus;
  score: string | null;
  recommendation: EvaluationRecommendation | null;
  summary: string | null;
  requiresHumanReview: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface EvaluationAcceptanceCoverage {
  total: number;
  met: number;
  notApplicable?: number;
  unmet: number;
  pending?: number;
  items: EvaluationRubricItem[];
}

export interface EvaluationRunDetail extends EvaluationRun {
  acceptanceCoverage: EvaluationAcceptanceCoverage | null;
  riskFlags: string[] | null;
  findings: Record<string, unknown> | null;
  startedAt: string | null;
  trigger?: string | null;
  evaluatedCommitSha?: string | null;
  evidenceBundle?: {
    executionMode?: string;
    commitSha?: string | null;
    snapshotVerified?: boolean;
    verification?: {
      complete?: boolean;
      commandsAttempted?: number;
      commandsFailed?: number;
      coverage?: Record<string, boolean>;
    } | null;
    inspectionCoverage?: {
      manifestFiles?: number;
      changedFiles?: number;
      inspectedFiles?: number;
      changedFileCoverage?: number;
      sourceChars?: number;
    } | null;
    githubChecks?: {
      combinedStatus?: string | null;
    } | null;
    summaryMarkdown?: string | null;
  } | null;
  // Admin-only provenance (undefined for customer/freelancer viewers).
  modelName?: string | null;
  promptVersion?: string | null;
  agentJobId?: string | null;
  error?: string | null;
}

export interface QueueEvaluationResult {
  evaluationRunId: string;
  agentJobId: string | null;
  status: string;
  reused?: boolean;
}

interface ApiDataResponse<T> {
  status: string;
  data: T;
}

interface PaginatedResponse<T> {
  status: string;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export async function queueEvaluation(
  submissionId: string,
  payload: { mode?: "async" | "sync"; reason?: string } = {},
): Promise<QueueEvaluationResult> {
  try {
    const { data } = await api.post<ApiDataResponse<QueueEvaluationResult>>(
      deliveryEndpoints.evaluations.create(submissionId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not queue the evaluation"),
    );
  }
}

export async function listSubmissionEvaluations(
  submissionId: string,
): Promise<EvaluationRun[]> {
  try {
    const { data } = await api.get<ApiDataResponse<EvaluationRun[]>>(
      deliveryEndpoints.evaluations.submissionList(submissionId),
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load evaluations"));
  }
}

export async function getEvaluationRun(
  evaluationRunId: string,
): Promise<EvaluationRunDetail> {
  try {
    const { data } = await api.get<ApiDataResponse<EvaluationRunDetail>>(
      deliveryEndpoints.evaluations.detail(evaluationRunId),
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load the evaluation run"),
    );
  }
}

export async function retryEvaluationRun(
  evaluationRunId: string,
  payload: { reason?: string } = {},
): Promise<QueueEvaluationResult> {
  try {
    const { data } = await api.post<ApiDataResponse<QueueEvaluationResult>>(
      deliveryEndpoints.evaluations.retry(evaluationRunId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not retry the evaluation"),
    );
  }
}

export async function getAdminEvaluations(params?: {
  status?: string;
  recommendation?: string;
  projectId?: string;
  submissionId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<EvaluationRunDetail>> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.recommendation)
      query.append("recommendation", params.recommendation);
    if (params?.projectId) query.append("projectId", params.projectId);
    if (params?.submissionId) query.append("submissionId", params.submissionId);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const { data } = await api.get<PaginatedResponse<EvaluationRunDetail>>(
      `${deliveryEndpoints.evaluations.adminList}?${query.toString()}`,
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load evaluations"));
  }
}
