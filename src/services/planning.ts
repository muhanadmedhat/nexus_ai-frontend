import { api, sprint4Endpoints, getApiErrorMessage } from "@/lib/api";

type JsonObject = Record<string, unknown>;

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
  milestones: any[];
  tasks: any[];
  dependencies: any[];
  teamPlan: JsonObject;
  riskRegister: any[];
  adminNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

interface ApiDataResponse<T> {
  status: string;
  data: T;
}

export async function createPlanningSubmission(
  projectId: string,
  payload: { assignmentId: string; submissionType: "architecture" | "ui_ux"; title: string; summary: string; content: JsonObject; fileUrls: JsonObject; status: "submitted" | "draft" }
) {
  try {
    const { data } = await api.post<ApiDataResponse<PlanningSubmission>>(
      sprint4Endpoints.planning.createSubmission(projectId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not create planning submission"));
  }
}

export async function getProjectSubmissions(projectId: string, params?: { submissionType?: string; status?: string; page?: number; limit?: number }) {
  try {
    const query = new URLSearchParams();
    if (params?.submissionType) query.append("submissionType", params.submissionType);
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const { data } = await api.get<any>(
      `${sprint4Endpoints.planning.projectSubmissions(projectId)}?${query.toString()}`
    );
    return data.data ? data.data : (Array.isArray(data) ? data : []);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load planning submissions"));
  }
}

export async function getSubmissionDetail(submissionId: string): Promise<PlanningSubmission> {
  try {
    const { data } = await api.get<ApiDataResponse<PlanningSubmission>>(
      sprint4Endpoints.planning.submissionDetail(submissionId)
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load submission detail"));
  }
}

export async function reviewSubmission(
  submissionId: string,
  payload: { status: "approved" | "changes_requested" | "rejected"; adminNotes?: string }
) {
  try {
    const { data } = await api.patch<ApiDataResponse<any>>(
      sprint4Endpoints.planning.reviewSubmission(submissionId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not review submission"));
  }
}

export async function generateProjectPlan(
  projectId: string,
  payload: { architectureSubmissionId: string; uiuxSubmissionId: string; mode?: "async" | "sync"; notes?: string }
) {
  try {
    const { data } = await api.post<ApiDataResponse<any>>(
      sprint4Endpoints.planning.generatePlan(projectId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not generate project plan"));
  }
}

export async function getProjectPlans(projectId: string, params?: { status?: string; isCurrent?: string | boolean; page?: number; limit?: number }) {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.isCurrent !== undefined) query.append("isCurrent", String(params.isCurrent));
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const { data } = await api.get<any>(
      `${sprint4Endpoints.planning.projectPlans(projectId)}?${query.toString()}`
    );
    return data.data ? data.data : Object.values(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load project plans"));
  }
}

export async function getProjectPlanDetail(planId: string): Promise<ProjectPlan> {
  try {
    const { data } = await api.get<ApiDataResponse<ProjectPlan>>(
      sprint4Endpoints.planning.planDetail(planId)
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load project plan detail"));
  }
}

export async function reviewProjectPlan(
  planId: string,
  payload: { status: "approved" | "changes_requested" | "rejected"; adminNotes?: string; materialize?: boolean }
) {
  try {
    const { data } = await api.patch<ApiDataResponse<any>>(
      sprint4Endpoints.planning.reviewPlan(planId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not review project plan"));
  }
}

export async function materializeProjectPlan(
  planId: string,
  payload: { replaceExisting?: boolean } = {}
) {
  try {
    const { data } = await api.post<ApiDataResponse<any>>(
      sprint4Endpoints.planning.materializePlan(planId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not materialize project plan"));
  }
}

export async function getMilestones(projectId: string) {
  try {
    const { data } = await api.get<ApiDataResponse<any[]>>(
      sprint4Endpoints.planning.milestones(projectId)
    );
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load milestones"));
  }
}

export async function getTasks(projectId: string, params?: { milestoneId?: string; status?: string; assignedFreelancerProfileId?: string; page?: number; limit?: number }) {
  try {
    const query = new URLSearchParams();
    if (params?.milestoneId) query.append("milestoneId", params.milestoneId);
    if (params?.status) query.append("status", params.status);
    if (params?.assignedFreelancerProfileId) query.append("assignedFreelancerProfileId", params.assignedFreelancerProfileId);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const { data } = await api.get<any>(
      `${sprint4Endpoints.planning.tasks(projectId)}?${query.toString()}`
    );
    return Array.isArray(data.data) ? data.data : (data.data as any).tasks || data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load tasks"));
  }
}

export async function updateTask(taskId: string, payload: { status?: string; assignedFreelancerProfileId?: string; assignmentId?: string; notes?: string }) {
  try {
    const { data } = await api.patch<ApiDataResponse<any>>(
      sprint4Endpoints.planning.updateTask(taskId),
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not update task"));
  }
}
