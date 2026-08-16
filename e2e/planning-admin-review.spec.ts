import { expect, test, type Page, type Request } from "@playwright/test";

const admin = {
  id: "admin-user",
  firstName: "Admin",
  lastName: "Reviewer",
  email: "admin@nexus.test",
  phoneNumber: null,
  role: "admin",
  photoUrl: null,
  isEmailVerified: true,
};

function submission(recommendation: "approve" | "changes_requested") {
  return {
    id: "submission-1",
    projectId: "project-1",
    assignmentId: "assignment-1",
    submissionType: "architecture",
    version: 1,
    status: "submitted",
    title: "Architecture contract",
    summary: "Complete system and API contract.",
    freelancer: { id: "freelancer-1", name: "A. Architect", headline: null },
    content: {
      requirementEvidence: {
        api_contracts: {
          summary: "OpenAPI endpoints and error schemas",
          urls: ["https://example.com/openapi.pdf"],
        },
      },
    },
    adminNotes: null,
    evaluationStatus: "completed",
    evaluationScore: recommendation === "approve" ? 94 : 72,
    evaluationRecommendation: recommendation,
    evaluationResult: {
      passed: recommendation === "approve",
      score: recommendation === "approve" ? 94 : 72,
      recommendation,
      summary:
        recommendation === "approve"
          ? "All mandatory requirements passed."
          : "The retry policy needs an explicit exception.",
      checks: [],
      strengths: [],
      risks: [],
      revisionItems:
        recommendation === "approve" ? [] : ["Document the retry policy."],
      crossContractIssues: [],
      artifactManifest: { artifacts: [] },
      artifactManifestHash: "manifest-hash",
      evaluationInputHash: "input-hash",
      contextHash: "context-hash",
      promptVersion: "planning-evaluation-v1",
      modelName: "gemini-test",
      openIssues: [],
      resolvedIssues: [],
      regressions: [],
      reused: false,
      source: "ai_service",
    },
    evaluationAuditBundle: {
      schemaVersion: 1,
      capturedAt: "2026-08-16T10:00:00.000Z",
      executionMode: "kubernetes",
      summaryMarkdown: "# Planning evaluation",
      verdictSha256: "verdict-hash",
    },
    aiOverride: false,
    aiOverrideReason: null as string | null,
  };
}

async function mockAdminApi(
  page: Page,
  recommendation: "approve" | "changes_requested",
) {
  let current = submission(recommendation);
  let reviewRequest: Request | null = null;
  await page.addInitScript(() =>
    localStorage.setItem("nexus_ai_access_token", "browser-test-token"),
  );
  await page.route("http://localhost:3001/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/users/me") {
      return route.fulfill({ status: 200, json: { user: admin } });
    }
    if (path === "/api/planning-submissions/submission-1") {
      return route.fulfill({ status: 200, json: { status: "success", data: current } });
    }
    if (
      path === "/api/planning-submissions/submission-1/review" &&
      request.method() === "PATCH"
    ) {
      reviewRequest = request;
      const body = request.postDataJSON();
      current = {
        ...current,
        status: body.status,
        aiOverride: Boolean(body.aiOverride),
        aiOverrideReason: body.aiOverrideReason ?? null,
      };
      return route.fulfill({
        status: 200,
        json: { status: "success", data: { id: current.id, status: current.status } },
      });
    }
    return route.fulfill({ status: 200, json: { status: "success", data: [] } });
  });
  return { reviewRequest: () => reviewRequest };
}

test("admin approves an AI-passing planning submission", async ({ page }) => {
  const api = await mockAdminApi(page, "approve");
  await page.goto("/dashboard/admin/planning/submissions/submission-1");

  await expect(page.getByText("Recommendation: approve")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download audit" })).toBeVisible();
  await expect(page.getByLabel("Override AI recommendation")).toHaveCount(0);
  await page.getByRole("button", { name: "Approve" }).click();

  await expect.poll(() => api.reviewRequest() !== null).toBe(true);
  expect(api.reviewRequest()!.postDataJSON()).toEqual({ status: "approved" });
});

test("admin override stays disabled until responsibility and reason are recorded", async ({
  page,
}) => {
  const api = await mockAdminApi(page, "changes_requested");
  await page.goto("/dashboard/admin/planning/submissions/submission-1");

  const approve = page.getByRole("button", { name: "Approve" });
  const requestChanges = page.getByRole("button", { name: "Request changes" });
  await expect(approve).toBeDisabled();
  await expect(requestChanges).toBeDisabled();
  await page.getByLabel("Admin notes").fill("Please resolve the documented retry policy.");
  await expect(requestChanges).toBeEnabled();
  await page.getByLabel("Override AI recommendation").check();
  await page.getByLabel("Override reason").fill("too short");
  await expect(approve).toBeDisabled();
  const reason =
    "Customer signed an exception after reviewing the documented retry risk.";
  await page.getByLabel("Override reason").fill(reason);
  await expect(approve).toBeEnabled();
  await approve.click();

  await expect.poll(() => api.reviewRequest() !== null).toBe(true);
  expect(api.reviewRequest()!.postDataJSON()).toEqual({
    status: "approved",
    adminNotes: "Please resolve the documented retry policy.",
    aiOverride: true,
    aiOverrideReason: reason,
  });
});
