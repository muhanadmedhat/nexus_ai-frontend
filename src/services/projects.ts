import axios from "axios";
import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";
import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
} from "@/types/project";

interface ApiDataResponse<T> {
  status: string;
  data: T;
}

interface BackendProject {
  id: string;
  title: string;
  description: string | null;
  budgetMin: string | number | null;
  budgetMax: string | number | null;
  currency: string;
  deadline: string | null;
  isDeadlineFlexible: boolean;
  status: ProjectStatus;
  quotedAmount?: string | number | null;
  quotedCurrency?: string | null;
  quoteStatus?: string | null;
  quoteGeneratedAt?: string | null;
  quoteNotes?: string | null;
  automationStatus?: string | null;
  createdAt: string;
}

function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  if (typeof value === "number") return value;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toProject(row: BackendProject): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    budgetMin: toNumber(row.budgetMin),
    budgetMax: toNumber(row.budgetMax),
    currency: row.currency,
    deadline: row.deadline,
    isDeadlineFlexible: row.isDeadlineFlexible,
    status: row.status,
    quotedAmount: toNumber(row.quotedAmount ?? null),
    quotedCurrency: row.quotedCurrency ?? null,
    quoteStatus: row.quoteStatus ?? null,
    quoteGeneratedAt: row.quoteGeneratedAt ?? null,
    quoteNotes: row.quoteNotes ?? null,
    automationStatus: row.automationStatus ?? null,
    createdAt: row.createdAt,
  };
}

export async function listProjects(): Promise<Project[]> {
  try {
    const { data } = await api.get<ApiDataResponse<BackendProject[]>>(
      API_ENDPOINTS.projects.base,
    );
    return data.data.map(toProject);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load projects"));
  }
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const { data } = await api.get<ApiDataResponse<BackendProject>>(
      API_ENDPOINTS.projects.detail(id),
    );
    return toProject(data.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw new Error(getApiErrorMessage(error, "Could not load project"));
  }
}

export async function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  try {
    const { data } = await api.post<ApiDataResponse<BackendProject>>(
      API_ENDPOINTS.projects.base,
      input,
    );
    return toProject(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not create project"));
  }
}

export async function updateProject(
  id: string,
  input: Partial<CreateProjectInput>,
): Promise<Project> {
  try {
    const { data } = await api.patch<ApiDataResponse<BackendProject>>(
      API_ENDPOINTS.projects.detail(id),
      input,
    );
    return toProject(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not update project"));
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await api.delete(API_ENDPOINTS.projects.detail(id));
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not delete project"));
  }
}
