import { api, getApiErrorMessage } from "@/lib/api";

export interface ProjectInvitation {
  id: string;
  projectId: string;
  taskId: string | null;
  phase: "governance" | "planning" | "staffing" | "implementation";
  roleKey: string;
  status: "pending" | "accepted" | "declined" | "expired" | "cancelled";
  expiresAt: string;
  respondedAt: string | null;
  responseReason: string | null;
  rankSnapshot: number | null;
  scoreSnapshot: Record<string, unknown> | null;
  githubUsername?: string | null;
  githubReady?: boolean;
  project?: {
    id: string;
    title: string;
    description?: string | null;
    deadline?: string | null;
  };
  task?: {
    id: string;
    title: string;
    budgetAmount?: string | null;
    currency?: string | null;
    dueAt?: string | null;
  } | null;
}

export async function getInvitations(status?: string) {
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const { data } = await api.get<{ data: ProjectInvitation[] }>(
      `/invitations${query}`,
    );
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load invitations"));
  }
}

export async function respondToInvitation(
  invitationId: string,
  decision: "accepted" | "declined",
  reason?: string,
) {
  try {
    const { data } = await api.patch<{ data: { status: string } }>(
      `/invitations/${invitationId}/respond`,
      { decision, reason },
    );
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not respond to invitation"),
    );
  }
}
