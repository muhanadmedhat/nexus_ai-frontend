export type ProjectStatus =
  | "draft"
  | "brief_pending"
  | "in_progress"
  | "in_review"
  | "completed";

export interface Project {
  id: string;
  title: string;
  description: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  deadline: string | null; // ISO date
  isDeadlineFlexible: boolean;
  status: ProjectStatus;
  createdAt: string;
}

export interface CreateProjectInput {
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  deadline: string;
  isDeadlineFlexible: boolean;
}

// Requirements brief (mock agent chat).
export type BriefSender = "customer" | "agent";

export interface BriefMessage {
  id: string;
  briefId: string;
  senderType: BriefSender;
  message: string;
  createdAt: string;
}

export interface Brief {
  id: string;
  projectId: string;
  isComplete: boolean;
  summary: string | null;
  completionPercent: number;
  missingFields: string[];
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
  in_progress: "In progress",
  in_review: "In review",
  completed: "Completed",
};
