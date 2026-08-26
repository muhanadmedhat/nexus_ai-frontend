import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";

export interface AutomationIncident {
  id: string;
  projectId: string | null;
  subsystem: string;
  operation: string;
  errorCode: string;
  severity: "warning" | "error" | "critical";
  status: "open" | "resolved";
  message: string;
  context: Record<string, unknown> | null;
  occurrenceCount: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export async function listAutomationIncidents(filters?: {
  status?: string;
  subsystem?: string;
  projectId?: string;
}) {
  try {
    const { data } = await api.get<{
      status: string;
      data: AutomationIncident[];
      total: number;
    }>(API_ENDPOINTS.admin.automationIncidents, { params: filters });
    return { incidents: data.data, total: data.total };
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load automation incidents"),
    );
  }
}
