import { expect, test, type Page } from "@playwright/test";

const reviewer = {
  id: "reviewer-user",
  firstName: "Priya",
  lastName: "Reviewer",
  email: "reviewer@nexus.test",
  phoneNumber: null,
  role: "freelancer",
  photoUrl: null,
  isEmailVerified: true,
  isPhoneVerified: true,
};

const governanceAssignment = {
  assignmentId: "reviewer-assignment",
  projectId: "project-1",
  projectTitle: "QuickClinic booking platform",
  phase: "governance",
  roleKey: "principal_reviewer",
  status: "accepted",
  allocatedAmount: 640,
  currency: "USD",
  deadline: "2026-10-15T00:00:00.000Z",
  briefSummary: "Review planning and delivery decisions.",
  roleBriefSummary: "Own technical quality gates and approvals.",
  roleBriefStatus: "ready",
  nextAction: "review_project",
};

async function mockReviewerApi(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("nexus_ai_access_token", "browser-test-token"),
  );
  await page.route("http://localhost:3001/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/users/me") {
      return route.fulfill({ status: 200, json: { user: reviewer } });
    }
    if (path === "/api/reviewer/projects") {
      return route.fulfill({
        status: 404,
        json: { message: "Page not found", statusCode: 404 },
      });
    }
    if (path === "/api/freelancer/projects/assigned") {
      return route.fulfill({
        status: 200,
        json: {
          status: "success",
          data: [governanceAssignment],
          total: 1,
          page: 1,
          limit: 100,
        },
      });
    }
    if (path === "/api/freelancer-verification/me") {
      return route.fulfill({
        status: 200,
        json: {
          status: "success",
          data: {
            verificationStatus: "approved",
            nextAction: "approved",
            profileComplete: true,
          },
        },
      });
    }
    return route.fulfill({
      status: 200,
      json: { status: "success", data: [] },
    });
  });
}

test("reviewer directory survives a missing specialized endpoint", async ({
  page,
}) => {
  await mockReviewerApi(page);
  await page.goto("/reviewer");

  await expect(
    page.getByRole("heading", { name: "QuickClinic booking platform" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /QuickClinic booking platform/ }),
  ).toHaveAttribute("href", "/reviewer/projects/project-1");
  await expect(page.getByText("Page not found")).toHaveCount(0);
});

test("reviewer assignments are linked from normal freelancer project views", async ({
  page,
}) => {
  await mockReviewerApi(page);

  await page.goto("/dashboard/freelancer");
  await expect(
    page.getByRole("link", { name: /QuickClinic booking platform/ }),
  ).toHaveAttribute("href", "/reviewer/projects/project-1");

  await page.goto("/freelancer/projects");
  await expect(
    page.getByRole("link", { name: "Open reviewer workbench" }),
  ).toHaveAttribute("href", "/reviewer/projects/project-1");
});
