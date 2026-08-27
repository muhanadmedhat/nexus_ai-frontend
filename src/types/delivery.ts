import type { ProjectTask } from "@/services/planning";

// Sprint 5 delivery types.
// Field names and nullability are derived from the TypeORM entities in
// nexus-ai-backend; status unions are derived from the DB check constraints in
// 1785200000000-AddExecutionReadinessTables.ts, so they are what the database
// actually enforces rather than what the handoff prose lists.

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "superseded";

export type RevisionStatus = "open" | "in_progress" | "resolved" | "cancelled";

export type RevisionPriority = "low" | "medium" | "high" | "urgent";

export type ReleaseRequestStatus =
  "pending" | "approved" | "rejected" | "released" | "cancelled" | "failed";

export type EvaluationRunStatus =
  "queued" | "running" | "completed" | "failed" | "cancelled" | "superseded";

export type EvaluationRecommendation =
  "approve" | "changes_requested" | "reject" | "manual_review";

export type ReviewDecision =
  | "commented"
  | "approved"
  | "changes_requested"
  | "rejected"
  | "score_adjusted";

export type ReviewerRole = "admin" | "customer" | "ai" | "system";

export type DeliveryTaskStatus =
  | "todo"
  | "blocked"
  | "in_progress"
  | "review"
  | "changes_requested"
  | "done"
  | "cancelled";

export type SubmissionType =
  "pull_request" | "repository" | "file" | "figma" | "text";

export interface SubmissionContent {
  notes?: string;
  checklist?: string[];
  [key: string]: unknown;
}

export interface SubmissionFileUrls {
  screenshots?: string[];
  attachments?: string[];
  [key: string]: unknown;
}

// The handoff uses two shapes for items: plain strings on revision requests,
// { area, comment } objects on submission reviews.
export interface RequestedChanges {
  items?: Array<string | { area?: string; comment?: string }>;
  [key: string]: unknown;
}

export interface ProjectSubmission {
  id: string;
  projectId: string;
  milestoneId: string | null;
  taskId: string | null;
  assignmentId: string | null;
  freelancerProfileId: string | null;
  repositoryId: string | null;
  version: number;
  status: SubmissionStatus;
  title: string | null;
  summary: string | null;
  content: SubmissionContent | null;
  fileUrls: SubmissionFileUrls | null;
  repoUrl: string | null;
  branchName: string | null;
  pullRequestUrl: string | null;
  commitSha: string | null;
  metadata: Record<string, unknown> | null;
  submittedAt: string | null; // ISO date
  reviewedBy: string | null;
  reviewedAt: string | null; // ISO date
  approvedAt: string | null; // ISO date
  rejectedAt: string | null; // ISO date
  createdAt: string; // ISO date
  updatedAt: string; // ISO date

  submissionType: SubmissionType;

  reviews?: ProjectSubmissionReview[];
  evaluationRuns?: EvaluationRun[];
}

export interface ProjectSubmissionReview {
  id: string;
  projectId: string;
  submissionId: string;
  milestoneId: string | null;
  taskId: string | null;
  reviewerUserId: string | null;
  reviewerRole: ReviewerRole;
  decision: ReviewDecision;
  feedback: string | null;
  requestedChanges: RequestedChanges | null;
  score: string | null; // numeric -> arrives as "72.00"
  metadata: Record<string, unknown> | null;
  createdAt: string; // ISO date
}

export interface SubmissionCriterionReview {
  criterionKey: string;
  criterion: string;
  rating: number;
  comment: string | null;
}

export interface ProjectRevisionRequest {
  id: string;
  projectId: string;
  milestoneId: string | null;
  taskId: string | null;
  submissionId: string | null;
  requestedBy: string | null;
  assignedToFreelancerProfileId: string | null;
  status: RevisionStatus;
  priority: RevisionPriority;
  title: string;
  description: string | null;
  requestedChanges: RequestedChanges | null;
  metadata: Record<string, unknown> | null;
  dueAt: string | null; // ISO date
  resolvedAt: string | null; // ISO date
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface PaymentReleaseRequest {
  id: string;
  projectId: string;
  milestoneId: string | null;
  submissionId: string | null;
  paymentId: string | null;
  freelancerProfileId: string | null;
  amount: string; // numeric -> arrives as "2500.00"
  currency: string;
  status: ReleaseRequestStatus;
  reason: string | null;
  reviewNotes: string | null;
  requestedBy: string | null;
  reviewedBy: string | null;
  approvedAt: string | null; // ISO date
  rejectedAt: string | null; // ISO date
  releasedAt: string | null; // ISO date
  metadata: Record<string, unknown> | null;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface EvaluationRubricItem {
  key?: string;
  criterion: string;
  category?: string;
  status?: "met" | "not_applicable" | "unmet" | "unverified";
  met?: boolean;
  evidence?: string;
  mandatory?: boolean;
  allowNotApplicable?: boolean;
}

export interface EvaluationAcceptanceCoverage {
  total: number;
  met: number;
  notApplicable?: number;
  unmet: number;
  pending?: number;
  items: EvaluationRubricItem[];
  rubricSnapshot?: {
    criteria?: EvaluationRubricItem[];
    [key: string]: unknown;
  };
}

export interface EvaluationFindings {
  passed?: boolean;
  revisionRequested?: boolean;
  requiresHumanReview?: boolean;
  revisionNotes?: string;
  rubric?: EvaluationRubricItem[];
  findings?: string[];
  risks?: string[];
  source?: string;
  auditBundle?: Record<string, unknown>;
}

// Read-only here. Ebrahim owns evaluations.ts and the review screens; these
// types exist so the customer and freelancer pages can display an evaluation
// summary without depending on his service.
export interface EvaluationRun {
  id: string;
  projectId: string;
  milestoneId: string | null;
  taskId: string | null;
  submissionId: string | null;
  agentJobId: string | null;
  status: EvaluationRunStatus;
  score: string | null; // numeric -> arrives as "72.00"
  recommendation: EvaluationRecommendation | null;
  summary: string | null;
  findings: EvaluationFindings | null;
  acceptanceCoverage: EvaluationAcceptanceCoverage | null;
  riskFlags: string[] | null;
  modelName: string | null;
  promptVersion: string | null;
  trigger?: string | null;
  evaluatedCommitSha?: string | null;
  evidenceBundle?: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null; // ISO date
  completedAt: string | null; // ISO date
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

/**
 * Shape returned inside a task's `dependencies` array. The API maps the
 * project_task_dependencies join rows, so these are objects — never bare ids.
 */
export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
  dependencyType?: string | null;
  notes?: string | null;
}

// Sprint 5 adds assignment-audit and planning fields to project_tasks that the
// Sprint 4 ProjectTask interface predates. Extending rather than editing
// planning.ts keeps this out of the shared Sprint 4 surface.
export interface DeliveryTask extends ProjectTask {
  status: DeliveryTaskStatus | string;
  /** jsonb — normalized by the delivery helper before it is rendered. */
  acceptanceCriteria?: unknown;
  dependencies?: TaskDependency[] | null;
  /** Postgres numeric — arrives as a string such as "24.00". */
  estimatedHours?: string | number | null;
  /** Exact compensation allocated to this task from its milestone. */
  budgetAmount?: string | number | null;
  currency?: string | null;
  priority?: string | null;
  requiredSkills?: string[] | null;
  startsAt?: string | null;
  dueAt?: string | null; // ISO date

  // Written by the Sprint 5 assignment endpoint. Not currently returned by
  // GET /projects/:id/tasks, so treat as absent rather than null.
  sourceMatchingRunId?: string | null;
  sourceCandidateId?: string | null;
  assignedBy?: string | null;
  assignedAt?: string | null; // ISO date
  project?: {
    id: string;
    title: string;
    status: string;
    currency: string;
  } | null;
  milestone?: {
    id: string;
    title: string;
    status: string;
  } | null;
}

// Sprint 5 releases are ledger-only; live Connect transfers are Sprint 6.
export type TransferMode = "ledger_only";
