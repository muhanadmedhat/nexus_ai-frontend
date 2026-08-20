import { api, sprint4Endpoints, getApiErrorMessage } from "@/lib/api";

type JsonObject = Record<string, unknown>;

export interface PlanningRequirement {
  key: string;
  title: string;
  description: string;
  mandatory: boolean;
  requiresUrl: boolean;
  applicability: "required" | "optional";
  allowNotApplicable: boolean;
  rationale: string;
}

export interface PlanningRequirementEvidence {
  summary: string;
  urls: string[];
  disposition?: "covered" | "not_applicable";
  notApplicableReason?: string;
}

export interface PlanningEvaluationCheck {
  key: string;
  title: string;
  status: "met" | "not_applicable" | "partial" | "missing" | "conflict";
  mandatory: boolean;
  severity: "info" | "minor" | "major" | "blocker";
  evidence: string;
  feedback: string;
  citations: PlanningEvaluationCitation[];
}

export interface PlanningEvaluationCitation {
  artifactId: string;
  location: string;
  finding: string;
}

export interface PlanningEvaluationArtifact {
  id: string;
  sourceUrl: string | null;
  finalUrl: string | null;
  requirementKeys: string[];
  mimeType: string | null;
  sizeBytes: number;
  sha256: string | null;
  status: "inspected" | "unreadable" | "unsupported";
  error: string | null;
  location?: string;
  version?: string | null;
}

export interface PlanningEvaluationIssue {
  id: string;
  criterionKey: string;
  severity: "minor" | "major" | "blocker";
  message: string;
  citations: PlanningEvaluationCitation[];
}

export interface PlanningEvaluationResult {
  passed: boolean;
  score: number;
  recommendation: "approve" | "changes_requested" | "reject";
  summary: string;
  checks: PlanningEvaluationCheck[];
  strengths: string[];
  risks: string[];
  revisionItems: string[];
  crossContractIssues: string[];
  artifactManifest: {
    schemaVersion?: number;
    artifacts?: PlanningEvaluationArtifact[];
    totalBytes?: number;
    manifestHash?: string;
  };
  artifactManifestHash: string;
  evaluationInputHash: string;
  contextHash: string;
  promptVersion: string;
  modelName: string;
  openIssues: PlanningEvaluationIssue[];
  resolvedIssues: string[];
  regressions: string[];
  reused: boolean;
  source: string;
}

export interface PlanningRequirementsResponse {
  projectId: string;
  submissionType: "architecture" | "ui_ux";
  architectureApproved: boolean;
  architectureSubmissionId: string | null;
  profile: {
    complexity: "trivial" | "standard" | "complex";
    rationale: string;
    featureCount: number;
    features: string[];
    capabilities: Record<string, boolean>;
  };
  requirements: PlanningRequirement[];
}

export interface PlanningSubmission {
  id: string;
  projectId: string;
  assignmentId: string;
  submissionType: "architecture" | "ui_ux";
  version: number;
  status: string;
  title: string;
  summary: string;
  freelancer?: {
    id: string;
    name: string;
    headline: string | null;
  };
  submittedAt: string | null;
  reviewedAt: string | null;
  content?: JsonObject;
  fileUrls?: JsonObject;
  adminNotes?: string | null;
  reviewedBy?: string | null;
  evaluationStatus?:
    | "pending"
    | "pending_architecture"
    | "queued"
    | "running"
    | "completed"
    | "failed";
  evaluationScore?: number | null;
  evaluationRecommendation?: "approve" | "changes_requested" | "reject" | null;
  evaluationRequirements?: JsonObject | null;
  evaluationResult?: PlanningEvaluationResult | null;
  evaluationAuditBundle?: {
    schemaVersion?: number;
    capturedAt?: string;
    executionMode?: string;
    summaryMarkdown?: string;
    verdictSha256?: string;
    sandboxLog?: JsonObject | null;
    [key: string]: unknown;
  } | null;
  evaluationError?: string | null;
  evaluationAgentJobId?: string | null;
  evaluatedAt?: string | null;
  aiOverride?: boolean;
  aiOverrideReason?: string | null;
  aiOverriddenBy?: string | null;
  aiOverriddenAt?: string | null;
}

export interface ProjectPlan {
  id: string;
  projectId: string;
  version: number;
  status: string;
  isCurrent: boolean;
  architectureSubmissionId?: string;
  uiuxSubmissionId?: string;
  generatedByJobId?: string;
  summary: string;
  assumptions?: string[];
  timeline?: JsonObject;
  milestones: JsonObject[];
  tasks: JsonObject[];
  dependencies: JsonObject[];
  projectSpec?: JsonObject | null;
  teamPlan: JsonObject;
  riskRegister: JsonObject[];
  budgetAllocation?: {
    version: number;
    totalAmount: string | number;
    currency: string;
    complexity: string;
    planning: {
      architect: { amount: string | number; percentage: number };
      ui_ux: { amount: string | number; percentage: number };
    };
    implementation: { amount: string | number; percentage: number };
  } | null;
  adminNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: string;
  orderIndex?: number;
  /** Postgres numeric — arrives as a string such as "6000.00". */
  budgetAmount?: string | number | null;
  currency?: string | null;
  startsAt?: string | null;
  /** The API field is `dueAt`, not `dueDate`. */
  dueAt?: string | null;
  acceptanceCriteria?: unknown;
  taskCount?: number;
}

export interface TaskCheckpoint {
  id: string;
  taskId: string;
  title: string;
  orderIndex: number;
  dueAt: string;
  weightPercent: string | number;
  penaltyPercent: string | number;
  status: "pending" | "met" | "missed" | "completed_late" | "waived";
  completedAt: string | null;
  penaltyAmount: string | number;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  milestoneId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  roleKey?: string | null;
  assignedFreelancerProfileId?: string | null;
  assignmentId?: string | null;
  /** Exact share allocated from the task's milestone budget. */
  budgetAmount?: string | number | null;
  currency?: string | null;
  startsAt?: string | null;
  dueAt?: string | null;
  penaltyAmount?: string | number | null;
  deadlineStrikes?: number;
  maxDeadlineStrikes?: number;
  assignmentStatus?: string;
  acceptanceCriteria?: unknown;
  metadata?: {
    contractReferences?: string[];
    ownedPaths?: string[];
    integrationChecks?: string[];
  } | null;
  project?: {
    id: string;
    title: string;
    status: string;
    currency: string;
  } | null;
  milestone?: {
    id: string;
    title: string;
    status: string;
  } | null;
}

export interface ReviewSubmissionResult {
  id: string;
  status: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  planGenerationUnlocked?: boolean;
  planGenerationJob?: {
    queued: boolean;
    reason?: string;
    error?: string;
    planId?: string;
    agentJobId?: string;
    queueName?: string;
  } | null;
  uiuxEvaluationJob?: {
    status: string;
    submissionId: string;
    agentJobId?: string | null;
  } | null;
}

export interface ReviewProjectPlanResult {
  id?: string;
  status?: string;
  materialized?: boolean;
  milestoneCount?: number;
  taskCount?: number;
  matchingDispatch?: ImplementationMatchingDispatch;
  materialization?: {
    matchingDispatch?: ImplementationMatchingDispatch;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ImplementationMatchingDispatch {
  triggered: boolean;
  projectId: string;
  projectStatus?: string;
  processing?: string;
  reason?: string;
  error?: string;
  runs?: Array<{
    id: string;
    targetTaskId?: string | null;
    targetRoleKey?: string | null;
    status: string;
  }>;
}

interface ApiDataResponse<T> {
  status: string;
  data: T;
}

function dataOrArray<T>(payload: ApiDataResponse<T[]> | T[]): T[] {
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : [];
}

export async function createPlanningSubmission(
  projectId: string,
  payload: {
    assignmentId: string;
    submissionType: "architecture" | "ui_ux";
    title: string;
    summary: string;
    content: JsonObject;
    fileUrls: JsonObject;
    status: "submitted" | "draft";
  },
) {
  try {
    const { data } = await api.post<ApiDataResponse<PlanningSubmission>>(
      sprint4Endpoints.planning.createSubmission(projectId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not create planning submission"),
    );
  }
}

export async function uploadPlanningArtifact(projectId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  try {
    const { data } = await api.post<
      ApiDataResponse<{
        url: string;
        publicId: string;
        storageVersion: number;
        originalName: string;
        contentType: string;
        sizeBytes: number;
        sha256: string;
      }>
    >(sprint4Endpoints.planning.uploadArtifact(projectId), form);
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not upload planning artifact"),
    );
  }
}

export async function getPlanningRequirements(
  projectId: string,
  submissionType: "architecture" | "ui_ux",
): Promise<PlanningRequirementsResponse> {
  try {
    const { data } = await api.get<
      ApiDataResponse<PlanningRequirementsResponse>
    >(sprint4Endpoints.planning.requirements(projectId, submissionType));
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load planning requirements"),
    );
  }
}

export async function getProjectSubmissions(
  projectId: string,
  params?: {
    submissionType?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
) {
  try {
    const query = new URLSearchParams();
    if (params?.submissionType)
      query.append("submissionType", params.submissionType);
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const { data } = await api.get<
      ApiDataResponse<PlanningSubmission[]> | PlanningSubmission[]
    >(
      `${sprint4Endpoints.planning.projectSubmissions(projectId)}?${query.toString()}`,
    );
    return dataOrArray<PlanningSubmission>(data);
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load planning submissions"),
    );
  }
}

export async function getSubmissionDetail(
  submissionId: string,
): Promise<PlanningSubmission> {
  try {
    const { data } = await api.get<ApiDataResponse<PlanningSubmission>>(
      sprint4Endpoints.planning.submissionDetail(submissionId),
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load submission detail"),
    );
  }
}

export async function reviewSubmission(
  submissionId: string,
  payload: {
    status: "approved" | "changes_requested" | "rejected";
    adminNotes?: string;
    aiOverride?: boolean;
    aiOverrideReason?: string;
  },
) {
  try {
    const { data } = await api.patch<ApiDataResponse<ReviewSubmissionResult>>(
      sprint4Endpoints.planning.reviewSubmission(submissionId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not review submission"));
  }
}

export async function retryPlanningEvaluation(submissionId: string) {
  try {
    const { data } = await api.post<
      ApiDataResponse<{
        status: string;
        submissionId: string;
        agentJobId?: string | null;
        error?: string;
      }>
    >(sprint4Endpoints.planning.retrySubmissionEvaluation(submissionId));
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not retry planning evaluation"),
    );
  }
}

export async function generateProjectPlan(
  projectId: string,
  payload: {
    architectureSubmissionId: string;
    uiuxSubmissionId: string;
    mode?: "async" | "sync";
    notes?: string;
  },
) {
  try {
    const { data } = await api.post<ApiDataResponse<ReviewProjectPlanResult>>(
      sprint4Endpoints.planning.generatePlan(projectId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not generate project plan"),
    );
  }
}

export async function getProjectPlans(
  projectId: string,
  params?: {
    status?: string;
    isCurrent?: string | boolean;
    page?: number;
    limit?: number;
  },
) {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.isCurrent !== undefined)
      query.append("isCurrent", String(params.isCurrent));
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const { data } = await api.get<
      ApiDataResponse<ProjectPlan[]> | ProjectPlan[]
    >(
      `${sprint4Endpoints.planning.projectPlans(projectId)}?${query.toString()}`,
    );
    return dataOrArray<ProjectPlan>(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load project plans"));
  }
}

export async function getProjectPlanDetail(
  planId: string,
): Promise<ProjectPlan> {
  try {
    const { data } = await api.get<ApiDataResponse<ProjectPlan>>(
      sprint4Endpoints.planning.planDetail(planId),
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load project plan detail"),
    );
  }
}

export async function reviewProjectPlan(
  planId: string,
  payload: {
    status: "approved" | "changes_requested" | "rejected";
    adminNotes?: string;
    materialize?: boolean;
  },
) {
  try {
    const { data } = await api.patch<ApiDataResponse<ReviewProjectPlanResult>>(
      sprint4Endpoints.planning.reviewPlan(planId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not review project plan"));
  }
}

export async function materializeProjectPlan(
  planId: string,
  payload: { replaceExisting?: boolean } = {},
) {
  try {
    const { data } = await api.post<ApiDataResponse<ReviewProjectPlanResult>>(
      sprint4Endpoints.planning.materializePlan(planId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not materialize project plan"),
    );
  }
}

export async function getMilestones(projectId: string) {
  try {
    const { data } = await api.get<ApiDataResponse<ProjectMilestone[]>>(
      sprint4Endpoints.planning.milestones(projectId),
    );
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load milestones"));
  }
}

export async function getTasks(
  projectId: string,
  params?: {
    milestoneId?: string;
    status?: string;
    assignedFreelancerProfileId?: string;
    page?: number;
    limit?: number;
  },
) {
  try {
    const query = new URLSearchParams();
    if (params?.milestoneId) query.append("milestoneId", params.milestoneId);
    if (params?.status) query.append("status", params.status);
    if (params?.assignedFreelancerProfileId)
      query.append(
        "assignedFreelancerProfileId",
        params.assignedFreelancerProfileId,
      );
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const { data } = await api.get<
      ApiDataResponse<ProjectTask[] | { tasks: ProjectTask[] }>
    >(`${sprint4Endpoints.planning.tasks(projectId)}?${query.toString()}`);
    if (Array.isArray(data.data)) return data.data;
    return Array.isArray(data.data.tasks) ? data.data.tasks : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load tasks"));
  }
}

export async function getMyFreelancerTasks(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const limit = Math.min(100, Math.max(1, params?.limit ?? 100));
    let page = params?.page ?? 1;
    const tasks: ProjectTask[] = [];

    do {
      const query = new URLSearchParams();
      if (params?.status) query.append("status", params.status);
      query.append("page", String(page));
      query.append("limit", String(limit));

      const { data } = await api.get<
        ApiDataResponse<ProjectTask[]> & { total?: number }
      >(`${sprint4Endpoints.planning.freelancerTasks}?${query.toString()}`);
      const batch = Array.isArray(data.data) ? data.data : [];
      const total = typeof data.total === "number" ? data.total : null;
      tasks.push(...batch);

      if (
        params?.page ||
        batch.length < limit ||
        (total !== null && tasks.length >= total)
      ) {
        break;
      }
      page += 1;
    } while (true);

    return tasks;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load assigned tasks"));
  }
}

export async function updateTask(
  taskId: string,
  payload: { status?: string; notes?: string },
) {
  try {
    const { data } = await api.patch<ApiDataResponse<ProjectTask>>(
      sprint4Endpoints.planning.updateTask(taskId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not update task"));
  }
}

export async function getTaskCheckpoints(taskId: string) {
  try {
    const { data } = await api.get<ApiDataResponse<TaskCheckpoint[]>>(
      `/project-tasks/${taskId}/checkpoints`,
    );
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load task checkpoints"),
    );
  }
}

export async function completeTaskCheckpoint(
  taskId: string,
  checkpointId: string,
) {
  try {
    const { data } = await api.patch<ApiDataResponse<TaskCheckpoint>>(
      `/project-tasks/${taskId}/checkpoints/${checkpointId}/complete`,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not complete checkpoint"));
  }
}
