import { api } from "@/lib/api";
import type { CreateProjectInput, Project } from "@/types/project";

// Row shape from the backend (snake_case). Kept here so the mapping lives in
// one place once GET/POST /api/projects lands.
interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  deadline: string | null;
  is_deadline_flexible: boolean;
  status: Project["status"];
  created_at: string;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    currency: row.currency,
    deadline: row.deadline,
    isDeadlineFlexible: row.is_deadline_flexible,
    status: row.status,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Sprint 2 mock store. POST/GET /api/projects do not exist yet, so the flow is
// backed by an in-session array seeded with the sample project from the handoff.
// Delete this block once the backend routes land — the api calls below already
// target the real contract.
// ---------------------------------------------------------------------------
const mockProjects: Project[] = [
  {
    id: "sample-1",
    title: "E-commerce Website",
    description: "A storefront with product catalog, cart, and checkout.",
    budgetMin: 10000,
    budgetMax: 25000,
    currency: "EGP",
    deadline: "2026-08-01",
    isDeadlineFlexible: true,
    status: "draft",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
];

let mockSeq = 1;

// Contract: GET /api/projects
export async function listProjects(): Promise<Project[]> {
  try {
    const { data } = await api.get<ProjectRow[]>("/projects");
    return data.map(toProject);
  } catch {
    return [...mockProjects];
  }
}

// Contract: GET /api/projects/:id
export async function getProject(id: string): Promise<Project | null> {
  try {
    const { data } = await api.get<ProjectRow>(`/projects/${id}`);
    return toProject(data);
  } catch {
    return mockProjects.find((p) => p.id === id) ?? null;
  }
}

// Contract: POST /api/projects
export async function createProject(input: CreateProjectInput): Promise<Project> {
  try {
    const { data } = await api.post<ProjectRow>("/projects", input);
    return toProject(data);
  } catch {
    const project: Project = {
      id: `local-${++mockSeq}`,
      title: input.title,
      description: input.description,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      currency: input.currency,
      deadline: input.deadline || null,
      isDeadlineFlexible: input.isDeadlineFlexible,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    mockProjects.unshift(project);
    return project;
  }
}
