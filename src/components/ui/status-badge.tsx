import { clsx } from "clsx";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/types/project";

const STYLES: Record<ProjectStatus, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  brief_pending: "bg-secondary-container/20 text-secondary",
  in_progress: "bg-primary-container/15 text-primary-container",
  in_review: "bg-secondary-container/20 text-secondary",
  completed: "bg-primary-container/15 text-primary-container",
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
