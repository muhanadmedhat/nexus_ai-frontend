import { clsx } from "clsx";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatMoney } from "@/utils/format";
import type { ProjectMilestone } from "@/services/planning";
import type { DeliveryTask } from "@/types/delivery";

function progressFor(tasks: DeliveryTask[]) {
  if (!tasks.length) return null;
  const done = tasks.filter((task) => task.status === "done").length;
  return { done, total: tasks.length, percent: Math.round((done / tasks.length) * 100) };
}

/**
 * Ordered milestone spine with per-milestone task progress. Used by the
 * customer delivery workspace and the admin project delivery shell.
 *
 * `renderExtra` lets a page slot in its own per-milestone content — release
 * state on the customer view, release actions on the admin view — without this
 * component needing to know about payments.
 */
export function MilestoneTimeline({
  milestones,
  tasks = [],
  renderExtra,
  emptyLabel = "No milestones yet.",
  className,
}: {
  milestones: ProjectMilestone[];
  tasks?: DeliveryTask[];
  renderExtra?: (milestone: ProjectMilestone) => React.ReactNode;
  emptyLabel?: string;
  className?: string;
}) {
  if (!milestones.length) {
    return <p className={clsx("text-sm text-on-surface-variant", className)}>{emptyLabel}</p>;
  }

  const ordered = [...milestones].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );

  return (
    <ol className={clsx("flex flex-col", className)}>
      {ordered.map((milestone, index) => {
        const milestoneTasks = tasks.filter((task) => task.milestoneId === milestone.id);
        const progress = progressFor(milestoneTasks);
        const isLast = index === ordered.length - 1;

        return (
          <li key={milestone.id} className="grid grid-cols-[28px_1fr] gap-x-4">
            <div className="flex flex-col items-center">
              <span
                className={clsx(
                  "mt-1.5 h-3 w-3 shrink-0 rounded-full border-2",
                  milestone.status === "completed"
                    ? "border-primary-container bg-primary-container"
                    : "border-outline-variant bg-surface-container-lowest",
                )}
                aria-hidden
              />
              {!isLast && <span className="w-px flex-1 bg-outline-variant/50" aria-hidden />}
            </div>

            <div className={clsx("min-w-0", isLast ? "pb-0" : "pb-6")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-on-surface">{milestone.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                    {milestone.dueDate && <span>Due {formatDate(milestone.dueDate)}</span>}
                    {typeof milestone.budgetAmount === "number" && (
                      <span>{formatMoney(milestone.budgetAmount)}</span>
                    )}
                    {progress && (
                      <span>
                        {progress.done} of {progress.total} tasks done
                      </span>
                    )}
                  </div>
                </div>
                <StatusBadge status={milestone.status} />
              </div>

              {milestone.description && (
                <p className="mt-2 text-sm text-on-surface-variant">{milestone.description}</p>
              )}

              {progress && (
                <div
                  className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
                  role="progressbar"
                  aria-valuenow={progress.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${milestone.title} progress`}
                >
                  <div
                    className="h-full rounded-full bg-primary-container transition-[width]"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              )}

              {renderExtra && <div className="mt-3">{renderExtra(milestone)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
