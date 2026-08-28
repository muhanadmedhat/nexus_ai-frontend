import type { FreelancerAssignedProject } from "@/services/matching";

type NavigableAssignment = Pick<
  FreelancerAssignedProject,
  "phase" | "roleKey" | "projectId" | "tasks"
>;

export function isPrincipalReviewerAssignment(
  assignment: NavigableAssignment,
) {
  return (
    assignment.phase === "governance" &&
    assignment.roleKey === "principal_reviewer"
  );
}

export function freelancerAssignmentHref(assignment: NavigableAssignment) {
  if (isPrincipalReviewerAssignment(assignment)) {
    return `/reviewer/projects/${assignment.projectId}`;
  }

  if (assignment.phase === "planning") {
    return `/freelancer/projects/${assignment.projectId}/planning`;
  }

  if (assignment.tasks?.length === 1) {
    return `/freelancer/projects/${assignment.projectId}/tasks/${assignment.tasks[0].id}`;
  }

  return `/freelancer/projects/${assignment.projectId}`;
}

export function freelancerAssignmentActionLabel(
  assignment: NavigableAssignment,
) {
  if (isPrincipalReviewerAssignment(assignment)) {
    return "Open reviewer workbench";
  }
  if (assignment.phase === "planning") {
    return "Open planning deliverable";
  }
  if (assignment.tasks?.length === 1) return "Open task";
  return "Open project";
}
