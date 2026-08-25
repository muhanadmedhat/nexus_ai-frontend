import { api, sprint4Endpoints, getApiErrorMessage } from "@/lib/api";

type JsonObject = Record<string, unknown>;

export interface SkillBadge {
  skill: string;
  score?: number | null;
}

export interface MatchingRun {
  id: string;
  projectId: string;
  targetType: string;
  targetRoleKey: string;
  status: string;
  summary: string;
  candidateCount: number;
  selectedCandidateId?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface MatchingCandidate {
  id: string;
  matchingRunId: string;
  freelancerProfileId: string;
  rank: number;
  score: number;
  scoreBreakdown: JsonObject;
  rationale: string;
  evidence: JsonObject;
  status: string;
  freelancer: {
    id: string;
    name: string;
    email: string;
    headline: string | null;
    hourlyRate: number | null;
    availabilityHours: number | null;
    yearsExperience: number | null;
    topSkills: SkillBadge[];
    profileSummary?: string | null;
  };
}

export interface RunDetail extends MatchingRun {
  filters: JsonObject;
  inputSnapshot: JsonObject;
  error: string | null;
  candidates: MatchingCandidate[];
}

export interface RoleAssignment {
  id: string;
  projectId: string;
  phase: string;
  roleKey: string;
  status: string;
  freelancerProfileId: string;
  freelancer?: {
    name: string;
    headline: string | null;
    topSkills: SkillBadge[];
  };
  assignedAt: string;
  acceptedAt?: string | null;
  roleBrief?: RoleBrief | null;
  roleBriefStatus?: string | null;
  roleBriefGeneratedAt?: string | null;
  roleBriefError?: string | null;
  hourlyRateSnapshot?: string | number | null;
  allocatedAmount?: string | number | null;
  budgetAmount?: string | number | null;
  currency?: string | null;
  estimatedHours?: number | null;
  availabilityHoursSnapshot?: number | null;
}

export interface RoleBrief {
  title: string;
  summary: string;
  objectives: string[];
  responsibilities: string[];
  requiredInputs: string[];
  expectedDeliverables: string[];
  acceptanceCriteria: string[];
  handoffChecklist: string[];
  collaborationNotes: string;
  suggestedQuestions: string[];
  constraints: string[];
  source?: string;
}

export interface ReviewMatchingRunResult {
  runId: string;
  status: string;
  assignment: Pick<
    RoleAssignment,
    "id" | "projectId" | "phase" | "roleKey" | "status" | "freelancerProfileId"
  > | null;
}

export interface ProjectTeam {
  planningTeam: RoleAssignment[];
  implementationTeam?: RoleAssignment[];
}

export interface FreelancerAssignedProject {
  /** Implementation tasks in this assignment, so the row can link to the work. ISSUES.md #35. */
  tasks?: Array<{
    id: string;
    title: string;
    status?: string | null;
    assignmentStatus?: string | null;
    dueAt?: string | null;
  }>;
  assignmentId: string;
  projectId: string;
  projectTitle: string | null;
  phase: string;
  roleKey: string;
  status: string;
  allocatedAmount: number | null;
  currency: string | null;
  deadline: string | null;
  briefSummary: string | null;
  roleBriefSummary?: string | null;
  roleBriefStatus?: string | null;
  nextAction: string;
}

export interface FreelancerProjectAssignmentDetail {
  project: {
    id: string;
    title: string | null;
    description: string | null;
    status: string;
    planningStatus: string;
    currency: string | null;
    deadline: string | null;
    isDeadlineFlexible: boolean;
  };
  brief: {
    summary: string | null;
    briefText: string | null;
    businessDomain: string | null;
    mainGoal: string | null;
    targetUsers: string | null;
    coreFeatures: string | null;
    platforms: string | null;
    constraintsPreferences: string | null;
  };
  assignments: RoleAssignment[];
  implementationCompensation: {
    allocatedAmount: number | null;
    currency: string | null;
  };
}

export interface PaginatedRoleAssignments {
  status?: string;
  data: FreelancerAssignedProject[];
  total: number;
  page: number;
  limit: number;
}

interface ApiDataResponse<T> {
  status: string;
  data: T;
}

interface MatchingRunListData {
  runs?: MatchingRun[];
}

export async function startPlanningRoles(
  projectId: string,
  payload: {
    roles?: string[];
    filters?: JsonObject;
    mode?: "sync" | "async";
  } = {},
) {
  try {
    const { data } = await api.post<ApiDataResponse<unknown>>(
      sprint4Endpoints.matching.startPlanningRoles(projectId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not start planning roles matching"),
    );
  }
}

export async function getProjectMatchingRuns(
  projectId: string,
): Promise<MatchingRun[]> {
  try {
    const { data } = await api.get<
      ApiDataResponse<MatchingRun[] | MatchingRunListData>
    >(sprint4Endpoints.matching.projectRuns(projectId));
    const payload = data.data;
    return Array.isArray(payload)
      ? payload
      : Array.isArray(payload.runs)
        ? payload.runs
        : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load matching runs"));
  }
}

export async function getRunDetail(runId: string): Promise<RunDetail> {
  try {
    const { data } = await api.get<ApiDataResponse<RunDetail>>(
      sprint4Endpoints.matching.runDetail(runId),
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load run detail"));
  }
}

export async function updateCandidateStatus(
  candidateId: string,
  payload: { status: "shortlisted" | "selected" | "rejected"; reason?: string },
) {
  try {
    const { data } = await api.patch<ApiDataResponse<MatchingCandidate>>(
      sprint4Endpoints.matching.candidateStatus(candidateId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not update candidate status"),
    );
  }
}

export async function reviewMatchingRun(
  runId: string,
  payload: {
    decision: "approved" | "rejected" | "rerun_required";
    selectedCandidateId?: string;
    createAssignment?: boolean;
    notes?: string;
  },
) {
  try {
    const { data } = await api.post<ApiDataResponse<ReviewMatchingRunResult>>(
      sprint4Endpoints.matching.reviewRun(runId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not review matching run"));
  }
}

export async function createRoleAssignment(
  projectId: string,
  payload: {
    phase: "planning";
    roleKey: "architect" | "ui_ux";
    candidateId?: string;
    freelancerProfileId?: string;
    notes?: string;
    decisionReason?: string;
  },
) {
  try {
    const { data } = await api.post<ApiDataResponse<RoleAssignment>>(
      sprint4Endpoints.roleAssignments.create(projectId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not create role assignment"),
    );
  }
}

export async function getProjectRoleAssignments(
  projectId: string,
): Promise<RoleAssignment[]> {
  try {
    const { data } = await api.get<ApiDataResponse<RoleAssignment[]>>(
      sprint4Endpoints.roleAssignments.projectList(projectId),
    );
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load role assignments"),
    );
  }
}

export async function updateRoleAssignmentStatus(
  assignmentId: string,
  payload: {
    status:
      | "accepted"
      | "declined"
      | "in_progress"
      | "completed"
      | "cancelled"
      | "replaced";
    notes?: string;
  },
) {
  try {
    const { data } = await api.patch<ApiDataResponse<RoleAssignment>>(
      sprint4Endpoints.roleAssignments.updateStatus(assignmentId),
      payload,
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not update assignment status"),
    );
  }
}

export async function getProjectTeam(projectId: string) {
  try {
    const { data } = await api.get<ApiDataResponse<ProjectTeam>>(
      sprint4Endpoints.roleAssignments.projectTeam(projectId),
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load project team"));
  }
}

export async function getFreelancerAssignedProjects(params?: {
  phase?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const query = new URLSearchParams();
    if (params?.phase) query.append("phase", params.phase);
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const { data } = await api.get<PaginatedRoleAssignments>(
      `${sprint4Endpoints.roleAssignments.freelancerAssigned}?${query.toString()}`,
    );
    return data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load assigned projects"),
    );
  }
}

export async function getFreelancerProjectAssignment(projectId: string) {
  try {
    const { data } = await api.get<
      ApiDataResponse<FreelancerProjectAssignmentDetail>
    >(sprint4Endpoints.roleAssignments.freelancerProjectAssignment(projectId));
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load project assignment"),
    );
  }
}
