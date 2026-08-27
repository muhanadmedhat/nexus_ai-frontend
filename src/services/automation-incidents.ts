import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";

export interface IncidentSuggestedAction {
  key: string;
  label: string;
  description: string;
  href: string | null;
  priority: "primary" | "secondary";
}

export interface AutomationIncident {
  id: string;
  traceId: string;
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
  suggestedActions: IncidentSuggestedAction[];
}

export interface AutomationIncidentEvent {
  id: string;
  traceId: string;
  eventType: "occurred" | "reopened" | "resolved";
  severity: "warning" | "error" | "critical";
  message: string;
  context: Record<string, unknown> | null;
  trace: string | null;
  occurredAt: string;
}

export interface AutomationIncidentSummary {
  generatedAt: string;
  windowDays: number;
  totalOpen: number;
  criticalOpen: number;
  recurringOpen: number;
  occurredInWindow: number;
  resolvedInWindow: number;
  impactedProjects: number;
  averageResolutionMinutes: number | null;
  bySeverity: Record<string, number>;
  bySubsystem: Record<string, number>;
  byErrorCode: Array<{ errorCode: string; count: number }>;
  daily: Array<{ date: string; count: number }>;
}

export async function listAutomationIncidents(filters?: {
  status?: string;
  subsystem?: string;
  projectId?: string;
  severity?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
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

export async function getAutomationIncidentSummary(windowDays = 7) {
  try {
    const { data } = await api.get<{
      status: string;
      data: AutomationIncidentSummary;
    }>(API_ENDPOINTS.admin.automationIncidentSummary, {
      params: { windowDays },
    });
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load incident analytics"),
    );
  }
}

export async function getAutomationIncident(id: string) {
  try {
    const { data } = await api.get<{
      status: string;
      incident: AutomationIncident;
      events: AutomationIncidentEvent[];
    }>(API_ENDPOINTS.admin.automationIncidentDetail(id));
    return { incident: data.incident, events: data.events };
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not load the incident trace"),
    );
  }
}

export async function resolveAutomationIncident(
  id: string,
  resolutionNote?: string,
) {
  try {
    const { data } = await api.patch<{
      status: string;
      data: AutomationIncident;
    }>(API_ENDPOINTS.admin.resolveAutomationIncident(id), { resolutionNote });
    return data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not resolve the incident"),
    );
  }
}
