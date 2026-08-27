export type ProjectStatus =
  | "draft"
  | "brief_pending"
  | "brief_complete"
  | "waiting_for_pr"
  | "planning_matching"
  | "ready_for_funding"
  | "planning_assigned"
  | "planning_in_progress"
  | "planning_review"
  | "implementation_ready"
  | "ready_for_implementation_funding"
  | "matching"
  | "matched"
  | "in_progress"
  | "in_review"
  | "spec_in_progress"
  | "spec_under_review"
  | "spec_complete"
  | "scoped"
  | "assigned"
  | "active"
  | "under_review"
  | "completed"
  | "cancelled"
  | "disputed";

export interface Project {
  id: string;
  title: string;
  description: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  deadline: string | null; // ISO date
  staffingDeadline?: string | null;
  isDeadlineFlexible: boolean;
  status: ProjectStatus;
  quotedAmount?: number | null;
  quotedCurrency?: string | null;
  quoteStatus?: string | null;
  quoteGeneratedAt?: string | null;
  quoteNotes?: string | null;
  quoteEvidence?: Record<string, unknown> | null;
  automationStatus?: string | null;
  createdAt: string;
}

export const PROJECT_DELETION_BLOCKED_STATUSES: ProjectStatus[] = [
  "planning_assigned",
  "planning_in_progress",
  "planning_review",
  "implementation_ready",
  "ready_for_implementation_funding",
  "matched",
  "spec_in_progress",
  "spec_under_review",
  "spec_complete",
  "scoped",
  "assigned",
  "active",
  "under_review",
  "completed",
  "disputed",
];

export interface CreateProjectInput {
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  deadline: string;
  isDeadlineFlexible: boolean;
}

// Requirements brief.
export type BriefSender = "customer" | "agent";

export interface BriefFieldValues {
  businessDomain: string;
  mainGoal: string;
  targetUsers: string;
  coreFeatures: string;
  platforms: string;
  solutionType: string;
  scopeDetails: string;
  integrations: string;
  adminNeeds: string;
  deliverables: string;
  constraintsPreferences: string;
  clientBackground: string;
  suggestedTeamSize: string;
  experienceLevel: string;
  experienceMinYears: string;
}

export interface BriefMessage {
  id: string;
  briefId: string;
  senderType: BriefSender;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Brief {
  id: string;
  projectId: string;
  isComplete: boolean;
  summary: string | null;
  completionPercent: number;
  missingFields: string[];
  fields: BriefFieldValues;
  aiRevisionOpen: boolean;
  revisionCount: number;
  revisionLimit: number;
  canReopenAi: boolean;
  confirmedAt: string | null;
}

export interface Notification {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Draft",
  brief_pending: "Brief pending",
  brief_complete: "Brief complete",
  waiting_for_pr: "Waiting for reviewer",
  planning_matching: "Planning matching",
  ready_for_funding: "Team ready for funding",
  planning_assigned: "Planning assigned",
  planning_in_progress: "Planning in progress",
  planning_review: "Planning review",
  implementation_ready: "Implementation ready",
  ready_for_implementation_funding: "Implementation team ready for funding",
  matching: "Matching",
  matched: "Matched",
  in_progress: "In progress",
  in_review: "In review",
  spec_in_progress: "Spec in progress",
  spec_under_review: "Spec under review",
  spec_complete: "Spec complete",
  scoped: "Scoped",
  assigned: "Assigned",
  active: "Active",
  under_review: "Under review",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};
