import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";
import type {
  Brief,
  BriefFieldValues,
  BriefMessage,
  BriefSender,
} from "@/types/project";

const AI_REVISION_LIMIT = 3;

const REQUIRED_BRIEF_FIELDS = [
  { key: "businessDomain", label: "Business domain" },
  { key: "mainGoal", label: "Main goal" },
  { key: "targetUsers", label: "Target users" },
  { key: "coreFeatures", label: "Core features" },
  { key: "platforms", label: "Platforms" },
  { key: "solutionType", label: "Solution type" },
  { key: "scopeDetails", label: "Pages, screens and main journey" },
  { key: "integrations", label: "External integrations" },
  { key: "adminNeeds", label: "Admin needs" },
  { key: "deliverables", label: "Deliverables" },
  { key: "constraintsPreferences", label: "Constraints / preferences" },
  { key: "clientBackground", label: "Client background" },
  { key: "suggestedTeamSize", label: "Suggested team size" },
  { key: "experienceLevel", label: "Experience level" },
  { key: "experienceMinYears", label: "Experience min years" },
];

const PROJECT_DERIVED_FIELD_LABELS = new Set([
  "project type",
  "budget",
  "deadline",
]);

interface BackendBrief {
  id: string;
  projectId: string;
  isComplete: boolean;
  summary: string | null;
  projectType?: string | null;
  domain?: string | null;
  mainGoal?: string | null;
  targetUsers?: string | null;
  coreFeatures?: string | null;
  platforms?: string | null;
  budget?: string | null;
  deadlineText?: string | null;
  deliverablesText?: string | null;
  constraintsPreferences?: string | null;
  clientBackground?: string | null;
  suggestedTeamSize?: number | null;
  experienceLevel?: string | null;
  experienceMinYears?: number | null;
  missingFields?: string[] | null;
  completionPercentage?: number | null;
  aiRevisionOpen?: boolean | null;
  revisionCount?: number | null;
  revisionLimit?: number | null;
  confirmedAt?: string | null;
  extractedFields?: Record<string, unknown> | null;
  technical?: Record<string, unknown> | null;
  nonFunctional?: Record<string, unknown> | null;
  deliverables?: Record<string, unknown> | null;
  preferredTimeline?: string | null;
  deadlineDate?: string | null;
  briefText?: string | null;
  aiDecided: Record<string, unknown> | null;
}

interface BackendBriefMessage {
  id: string;
  briefId: string;
  senderType: string;
  message: string;
  createdAt: string;
}

interface BackendAiResult {
  completionPercentage?: unknown;
  missingFields?: unknown;
}

interface BackendSendBriefMessageResponse {
  brief: BackendBrief;
  customerMessage: BackendBriefMessage;
  agentMessage: BackendBriefMessage;
  ai?: BackendAiResult;
}

interface BackendReopenBriefResponse {
  brief: BackendBrief;
  messages: BackendBriefMessage[];
}

function humanizeField(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => humanizeField(item))
    : [];
}

function asPlainObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function getExtractedFields(brief: BackendBrief): Record<string, unknown> {
  return (
    asPlainObject(brief.extractedFields) ??
    asPlainObject(brief.aiDecided?.extractedFields) ??
    {}
  );
}

function getRequirementValues(brief: BackendBrief) {
  const extracted = getExtractedFields(brief);
  const technical = asPlainObject(brief.technical) ?? {};
  const nonFunctional = asPlainObject(brief.nonFunctional) ?? {};
  const deliverables = asPlainObject(brief.deliverables) ?? {};
  const valuesByKey: Record<string, unknown> = {
    businessDomain: brief.domain ?? extracted.businessDomain,
    mainGoal: brief.mainGoal ?? technical.mainGoal ?? extracted.mainGoal,
    targetUsers: brief.targetUsers ?? technical.targetUsers ?? extracted.targetUsers,
    coreFeatures: brief.coreFeatures ?? technical.coreFeatures ?? extracted.coreFeatures,
    platforms: brief.platforms ?? technical.platforms ?? extracted.platforms,
    solutionType: technical.solutionType ?? extracted.solutionType,
    scopeDetails: technical.scopeDetails ?? extracted.scopeDetails,
    integrations: technical.integrations ?? extracted.integrations,
    adminNeeds: technical.adminNeeds ?? extracted.adminNeeds,
    deliverables: brief.deliverablesText ?? deliverables.items ?? extracted.deliverables,
    constraintsPreferences:
      brief.constraintsPreferences ??
      nonFunctional.constraintsPreferences ??
      extracted.constraintsPreferences,
    clientBackground: brief.clientBackground ?? extracted.clientBackground,
    suggestedTeamSize: brief.suggestedTeamSize ?? extracted.suggestedTeamSize,
    experienceLevel: brief.experienceLevel ?? extracted.experienceLevel,
    experienceMinYears: brief.experienceMinYears ?? extracted.experienceMinYears,
  };

  return REQUIRED_BRIEF_FIELDS.map((field) => ({
    ...field,
    value: valuesByKey[field.key],
  }));
}

function deriveMissingFields(brief: BackendBrief): string[] {
  return getRequirementValues(brief)
    .filter((field) => !hasValue(field.value))
    .map((field) => field.label);
}

function deriveCompletionPercent(brief: BackendBrief): number {
  const fields = getRequirementValues(brief);
  const completed = fields.filter((field) => hasValue(field.value)).length;

  if (fields.length === 0) return 0;
  return Math.round((completed / fields.length) * 100);
}

function previewValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "number") return String(value);
  return "";
}

function getAiString(brief: BackendBrief, key: string): string | null {
  const direct = brief[key as keyof BackendBrief];
  if (typeof direct === "string" && direct.trim()) return direct;
  const value = brief.aiDecided?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getAiNumber(brief: BackendBrief, key: string, fallback: number): number {
  const direct = brief[key as keyof BackendBrief];
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  const value = brief.aiDecided?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getAiBoolean(brief: BackendBrief, key: string): boolean {
  const direct = brief[key as keyof BackendBrief];
  if (typeof direct === "boolean") return direct;
  return brief.aiDecided?.[key] === true;
}

function toBriefFields(brief: BackendBrief): BriefFieldValues {
  const values = getRequirementValues(brief);
  const byKey = Object.fromEntries(
    values.map((field) => [field.key, previewValue(field.value)]),
  ) as Partial<BriefFieldValues>;

  return {
    businessDomain: byKey.businessDomain ?? "",
    mainGoal: byKey.mainGoal ?? "",
    targetUsers: byKey.targetUsers ?? "",
    coreFeatures: byKey.coreFeatures ?? "",
    platforms: byKey.platforms ?? "",
    solutionType: byKey.solutionType ?? "",
    scopeDetails: byKey.scopeDetails ?? "",
    integrations: byKey.integrations ?? "",
    adminNeeds: byKey.adminNeeds ?? "",
    deliverables: byKey.deliverables ?? "",
    constraintsPreferences: byKey.constraintsPreferences ?? "",
    clientBackground: byKey.clientBackground ?? "",
    suggestedTeamSize: byKey.suggestedTeamSize ?? "",
    experienceLevel: byKey.experienceLevel ?? "",
    experienceMinYears: byKey.experienceMinYears ?? "",
  };
}

function toOptionalInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function deriveSummary(brief: BackendBrief): string | null {
  const captured = getRequirementValues(brief)
    .filter((field) => hasValue(field.value))
    .map((field) => {
      const value = previewValue(field.value);
      return value ? `${field.label}: ${value}` : null;
    })
    .filter((item): item is string => Boolean(item));

  return captured.length > 0 ? captured.slice(0, 3).join(" · ") : null;
}

function toCompletionPercent(brief: BackendBrief, ai?: BackendAiResult): number {
  const raw =
    ai?.completionPercentage ??
    brief.completionPercentage ??
    brief.aiDecided?.completionPercentage ??
    0;
  const derived = deriveCompletionPercent(brief);
  const value =
    typeof raw === "number" && Number.isFinite(raw)
      ? Math.max(raw, derived)
      : derived;

  if (brief.isComplete) return 100;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toBrief(brief: BackendBrief, ai?: BackendAiResult): Brief {
  const rawMissingFields =
    ai?.missingFields ?? brief.missingFields ?? brief.aiDecided?.missingFields;
  const revisionCount = getAiNumber(brief, "revisionCount", 0);
  const revisionLimit = getAiNumber(brief, "revisionLimit", AI_REVISION_LIMIT);
  const capturedLabels = new Set(
    getRequirementValues(brief)
      .filter((field) => hasValue(field.value))
      .map((field) => field.label.toLowerCase()),
  );
  const rawMissingList = Array.isArray(rawMissingFields)
    ? toStringList(rawMissingFields)
    : [];
  const sourceMissingFields =
    rawMissingList.length > 0 ? rawMissingList : deriveMissingFields(brief);
  const missingFields = sourceMissingFields.filter(
    (field) =>
      !capturedLabels.has(field.toLowerCase()) &&
      !PROJECT_DERIVED_FIELD_LABELS.has(field.toLowerCase()),
  );

  return {
    id: brief.id,
    projectId: brief.projectId,
    isComplete: brief.isComplete,
    summary: brief.summary ?? deriveSummary(brief),
    completionPercent: toCompletionPercent(brief, ai),
    missingFields: brief.isComplete ? [] : missingFields,
    fields: toBriefFields(brief),
    aiRevisionOpen: getAiBoolean(brief, "aiRevisionOpen"),
    revisionCount,
    revisionLimit,
    canReopenAi: brief.isComplete && revisionCount < revisionLimit,
    confirmedAt: getAiString(brief, "confirmedAt"),
  };
}

function toSenderType(senderType: string): BriefSender {
  return senderType === "customer" ? "customer" : "agent";
}

function toBriefMessage(message: BackendBriefMessage): BriefMessage {
  return {
    id: message.id,
    briefId: message.briefId,
    senderType: toSenderType(message.senderType),
    message: message.message,
    createdAt: message.createdAt,
  };
}

export async function getBrief(projectId: string): Promise<Brief> {
  try {
    const { data } = await api.get<BackendBrief>(
      API_ENDPOINTS.projects.brief(projectId),
    );

    return toBrief(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load brief"));
  }
}

export async function getBriefMessages(projectId: string): Promise<BriefMessage[]> {
  try {
    const { data } = await api.get<BackendBriefMessage[]>(
      API_ENDPOINTS.projects.briefMessages(projectId),
    );

    return data.map(toBriefMessage);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load brief messages"));
  }
}

export async function sendBriefMessage(
  projectId: string,
  message: string,
): Promise<{ messages: BriefMessage[]; brief: Brief }> {
  try {
    const { data } = await api.post<BackendSendBriefMessageResponse>(
      API_ENDPOINTS.projects.briefMessages(projectId),
      { content: message },
    );

    return {
      messages: [data.customerMessage, data.agentMessage].map(toBriefMessage),
      brief: toBrief(data.brief, data.ai),
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not send brief message"));
  }
}

export async function updateBrief(
  projectId: string,
  fields: BriefFieldValues,
): Promise<Brief> {
  try {
    const payload = {
      ...fields,
      suggestedTeamSize: toOptionalInteger(fields.suggestedTeamSize),
      experienceMinYears: toOptionalInteger(fields.experienceMinYears),
    };
    const { data } = await api.patch<BackendBrief>(
      API_ENDPOINTS.projects.brief(projectId),
      payload,
    );

    return toBrief(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not update brief"));
  }
}

export async function reopenBriefAiHelp(
  projectId: string,
): Promise<{ messages: BriefMessage[]; brief: Brief }> {
  try {
    const { data } = await api.post<BackendReopenBriefResponse>(
      API_ENDPOINTS.projects.briefReopen(projectId),
    );

    return {
      messages: data.messages.map(toBriefMessage),
      brief: toBrief(data.brief),
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not reopen AI help"));
  }
}

export async function confirmBrief(projectId: string): Promise<Brief> {
  try {
    const { data } = await api.post<BackendBrief>(
      API_ENDPOINTS.projects.briefConfirm(projectId),
    );

    return toBrief(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not confirm brief"));
  }
}
