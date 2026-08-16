import { clsx } from "clsx";
import { PROJECT_STATUS_LABEL } from "@/types/project";

const STYLES: Record<string, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  brief_pending: "bg-secondary-container/20 text-secondary",
  brief_complete: "bg-primary-container/15 text-primary-container",
  planning_matching: "bg-surface-container-high text-on-surface-variant",
  planning_assigned: "bg-primary-container/15 text-primary-container",
  planning_in_progress: "bg-secondary-container/20 text-secondary",
  planning_review: "bg-secondary-container/20 text-secondary",
  implementation_ready: "bg-primary-container/15 text-primary-container",
  matching: "bg-surface-container-high text-on-surface-variant",
  matched: "bg-primary-container/15 text-primary-container",
  in_progress: "bg-primary-container/15 text-primary-container",
  in_review: "bg-secondary-container/20 text-secondary",
  spec_in_progress: "bg-secondary-container/20 text-secondary",
  spec_under_review: "bg-secondary-container/20 text-secondary",
  spec_complete: "bg-primary-container/15 text-primary-container",
  scoped: "bg-primary-container/15 text-primary-container",
  assigned: "bg-primary-container/15 text-primary-container",
  active: "bg-primary-container/15 text-primary-container",
  under_review: "bg-secondary-container/20 text-secondary",
  completed: "bg-primary-container/15 text-primary-container",
  cancelled: "bg-error/10 text-error",
  disputed: "bg-error/10 text-error",

  queued: "bg-surface-container-high text-on-surface-variant",
  running: "bg-secondary-container/20 text-secondary",
  failed: "bg-error/10 text-error",
  submitted: "bg-surface-container-high text-on-surface-variant",
  approved: "bg-primary-container/15 text-primary-container",
  selected: "bg-primary-container/15 text-primary-container",
  generated: "bg-secondary-container/20 text-secondary",
  changes_requested: "bg-secondary-container/20 text-secondary",
  rejected: "bg-error/10 text-error",
  rerun_required: "bg-secondary-container/20 text-secondary",
  shortlisted: "bg-secondary-container/20 text-secondary",
  not_ready: "bg-surface-container-high text-on-surface-variant",
  pending_customer: "bg-secondary-container/20 text-secondary",
  accepted: "bg-primary-container/15 text-primary-container",
  out_of_budget: "bg-error/10 text-error",
  requires_payment: "bg-secondary-container/20 text-secondary",
  processing: "bg-secondary-container/20 text-secondary",
  succeeded: "bg-primary-container/15 text-primary-container",
  met: "bg-primary-container/15 text-primary-container",
  unmet: "bg-error/10 text-error",
  not_applicable: "bg-surface-container-high text-on-surface-variant",

  // Sprint 5 delivery — task statuses
  todo: "bg-surface-container-high text-on-surface-variant",
  blocked: "bg-error/10 text-error",
  review: "bg-secondary-container/20 text-secondary",
  done: "bg-primary-container/15 text-primary-container",

  // Sprint 5 delivery — milestone statuses (their own vocabulary)
  planned: "bg-surface-container-high text-on-surface-variant",
  funding_required: "bg-error/10 text-error",
  funded: "bg-primary-container/15 text-primary-container",
  paid: "bg-primary-container/15 text-primary-container",

  // Sprint 5 delivery — submissions
  superseded: "bg-surface-container-high text-on-surface-variant",

  // Sprint 5 delivery — revision requests
  open: "bg-secondary-container/20 text-secondary",
  resolved: "bg-primary-container/15 text-primary-container",

  // Sprint 5 delivery — payment release requests
  pending: "bg-surface-container-high text-on-surface-variant",
  released: "bg-primary-container/15 text-primary-container",

  // Sprint 5 delivery — repositories and collaborator invites
  creating: "bg-secondary-container/20 text-secondary",
  archived: "bg-surface-container-high text-on-surface-variant",
  invited: "bg-secondary-container/20 text-secondary",
  missing_username: "bg-error/10 text-error",
  declined: "bg-error/10 text-error",
  removed: "bg-surface-container-high text-on-surface-variant",
};

function labelFor(status: string) {
  return (
    PROJECT_STATUS_LABEL[status as keyof typeof PROJECT_STATUS_LABEL] ??
    status
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status] ?? "bg-surface-container-high text-on-surface-variant",
      )}
    >
      {labelFor(status)}
    </span>
  );
}
