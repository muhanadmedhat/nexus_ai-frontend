import type {
  EvaluationRun,
  PaymentReleaseRequest,
  ProjectRevisionRequest,
  ProjectSubmission,
  ProjectSubmissionReview,
} from "@/types/delivery";

/**
 * Fixture data for the Sprint 5 delivery pages.
 *
 * The backend submission, revision and release-request routes do not exist yet
 * (Asaad's vertical). These fixtures let the pages be built and reviewed against
 * realistically shaped data, and are deleted once the real routes land — the
 * call sites never change, only the service internals.
 *
 * Enable with NEXT_PUBLIC_USE_DELIVERY_FIXTURES=true in .env.local.
 */
export function deliveryFixturesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_DELIVERY_FIXTURES === "true";
}

const PROJECT_ID = "8f2b1c44-0d3e-4a6f-9c21-5e7a8b3d1f60";
const TASK_ID = "3a9d5e12-7c48-4b0a-8f31-2d6c9e4a7b58";
const MILESTONE_ID = "c1e7f902-4a3b-4d85-9e26-8b0f3c5a7d19";
const FREELANCER_ID = "5d8c3a71-9e2f-4b06-8a53-1f7d4c2e9b30";
const SUBMISSION_ID = "b4f1a836-2c5d-4e79-9013-6a8e5f2c7d41";

export const fixtureSubmissions: ProjectSubmission[] = [
  {
    id: SUBMISSION_ID,
    projectId: PROJECT_ID,
    milestoneId: MILESTONE_ID,
    taskId: TASK_ID,
    assignmentId: null,
    freelancerProfileId: FREELANCER_ID,
    repositoryId: "9c2e5b70-8d14-4f3a-a627-3e9b1d6c8f52",
    version: 2,
    status: "under_review",
    title: "Checkout API implementation",
    summary: "Implemented checkout session creation and webhook persistence.",
    content: {
      notes: "Includes tests and migration.",
      checklist: ["API route", "Stripe webhook", "unit tests"],
    },
    fileUrls: {
      screenshots: ["https://res.cloudinary.com/demo/image/upload/checkout-flow.png"],
      attachments: [],
    },
    repoUrl: "https://github.com/nexus-ai/project-bakery-ecommerce",
    branchName: "feat/checkout-api",
    pullRequestUrl: "https://github.com/nexus-ai/project-bakery-ecommerce/pull/4",
    commitSha: "abc123def456",
    metadata: null,
    submittedAt: "2026-08-11T10:00:00.000Z",
    reviewedBy: null,
    reviewedAt: null,
    approvedAt: null,
    rejectedAt: null,
    createdAt: "2026-08-10T08:30:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
    submissionType: "pull_request",
  },
  {
    id: "e7a2c091-5b48-4d36-8f72-9c1e3a6b5d84",
    projectId: PROJECT_ID,
    milestoneId: MILESTONE_ID,
    taskId: TASK_ID,
    assignmentId: null,
    freelancerProfileId: FREELANCER_ID,
    repositoryId: "9c2e5b70-8d14-4f3a-a627-3e9b1d6c8f52",
    version: 1,
    status: "superseded",
    title: "Checkout API implementation",
    summary: "First pass at checkout session creation.",
    content: { notes: "Webhook handling still outstanding." },
    fileUrls: null,
    repoUrl: "https://github.com/nexus-ai/project-bakery-ecommerce",
    branchName: "feat/checkout-api",
    pullRequestUrl: null,
    commitSha: "9f8e7d6c5b4a",
    metadata: null,
    submittedAt: "2026-08-08T14:20:00.000Z",
    reviewedBy: null,
    reviewedAt: "2026-08-09T09:05:00.000Z",
    approvedAt: null,
    rejectedAt: null,
    createdAt: "2026-08-08T11:00:00.000Z",
    updatedAt: "2026-08-10T08:30:00.000Z",
    submissionType: "pull_request",
  },
];

export const fixtureReviews: ProjectSubmissionReview[] = [
  {
    id: "1b6d4e83-7a29-4c50-b3f8-5e2a9c7d1064",
    projectId: PROJECT_ID,
    submissionId: "e7a2c091-5b48-4d36-8f72-9c1e3a6b5d84",
    milestoneId: MILESTONE_ID,
    taskId: TASK_ID,
    reviewerUserId: "4e9b2d57-1c83-4a06-9f25-7b3d8e1c6a40",
    reviewerRole: "admin",
    decision: "changes_requested",
    feedback: "Checkout works, but the webhook path is missing tests.",
    requestedChanges: {
      items: [{ area: "tests", comment: "Add webhook success and duplicate event tests." }],
    },
    score: "64.00",
    metadata: null,
    createdAt: "2026-08-09T09:05:00.000Z",
  },
];

export const fixtureEvaluationRuns: EvaluationRun[] = [
  {
    id: "7d3f8a25-6b91-4e04-8c57-2a9d1f6e3b78",
    projectId: PROJECT_ID,
    milestoneId: MILESTONE_ID,
    taskId: TASK_ID,
    submissionId: SUBMISSION_ID,
    agentJobId: "0c5e9b34-8d72-4a16-bf83-1e6c4a9d2075",
    status: "completed",
    score: "72.00",
    recommendation: "changes_requested",
    summary:
      "Checkout session creation is present, but webhook idempotency tests are missing.",
    findings: {
      passed: false,
      revisionRequested: true,
      requiresHumanReview: true,
      revisionNotes: "Add webhook idempotency tests and resubmit.",
      rubric: [
        {
          criterion: "Endpoint creates checkout session",
          met: true,
          evidence: "API route exists and validates amount.",
        },
        {
          criterion: "Webhook is idempotent",
          met: false,
          evidence: "Webhook stores events but lacks a duplicate handling test.",
        },
      ],
      source: "local_mock",
    },
    acceptanceCoverage: {
      total: 2,
      met: 1,
      unmet: 1,
      items: [
        {
          criterion: "Endpoint creates checkout session",
          met: true,
          evidence: "API route exists and validates amount.",
        },
        {
          criterion: "Webhook is idempotent",
          met: false,
          evidence: "Webhook stores events but lacks a duplicate handling test.",
        },
      ],
    },
    riskFlags: ["payment_integrity", "missing_tests"],
    modelName: "gemini-2.0-flash",
    promptVersion: "submission-evaluation-v1",
    error: null,
    startedAt: "2026-08-11T10:00:30.000Z",
    completedAt: "2026-08-11T10:01:12.000Z",
    createdAt: "2026-08-11T10:00:05.000Z",
    updatedAt: "2026-08-11T10:01:12.000Z",
  },
];

export const fixtureRevisionRequests: ProjectRevisionRequest[] = [
  {
    id: "2f8c6a13-4d90-4b57-8e21-9a3f7c5d0e64",
    projectId: PROJECT_ID,
    milestoneId: MILESTONE_ID,
    taskId: TASK_ID,
    submissionId: "e7a2c091-5b48-4d36-8f72-9c1e3a6b5d84",
    requestedBy: "4e9b2d57-1c83-4a06-9f25-7b3d8e1c6a40",
    assignedToFreelancerProfileId: FREELANCER_ID,
    status: "in_progress",
    priority: "high",
    title: "Fix checkout webhook tests",
    description: "The implementation needs duplicate event handling tests.",
    requestedChanges: {
      items: ["Add duplicate webhook test", "Show event id in logs"],
    },
    metadata: null,
    dueAt: "2026-08-18T00:00:00.000Z",
    resolvedAt: null,
    createdAt: "2026-08-09T09:06:00.000Z",
    updatedAt: "2026-08-10T08:31:00.000Z",
  },
];

export const fixtureReleaseRequests: PaymentReleaseRequest[] = [
  {
    id: "6a4e1d97-3c58-4f20-9b76-8d2f5a3c1e09",
    projectId: PROJECT_ID,
    milestoneId: MILESTONE_ID,
    submissionId: SUBMISSION_ID,
    paymentId: "b8d3f5a1-9e72-4c06-8a54-2f7e1d9c3b60",
    freelancerProfileId: FREELANCER_ID,
    amount: "2500.00",
    currency: "EGP",
    status: "pending",
    reason: "Milestone 1 accepted.",
    reviewNotes: null,
    requestedBy: FREELANCER_ID,
    reviewedBy: null,
    approvedAt: null,
    rejectedAt: null,
    releasedAt: null,
    metadata: { transferMode: "ledger_only" },
    createdAt: "2026-08-12T12:00:00.000Z",
    updatedAt: "2026-08-12T12:00:00.000Z",
  },
];

export function paginateFixture<T>(items: T[], page = 1, limit = 20) {
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
  };
}
