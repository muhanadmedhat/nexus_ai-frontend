import { clsx } from "clsx";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/types/project";

const STYLES: Record<ProjectStatus, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  brief_pending: "bg-secondary-container/20 text-secondary",
  brief_complete: "bg-primary-container/15 text-primary-container",
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
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}
