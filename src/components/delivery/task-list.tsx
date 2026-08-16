"use client";

import { clsx } from "clsx";
import { Lock } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatMoney } from "@/utils/format";
import type { DeliveryTask } from "@/types/delivery";
import { getTaskDependencyState, indexTasksById, toNumber } from "./helpers";

export function TaskCard({
  task,
  tasksById,
  assigneeLabel,
  href,
  onSelect,
  selected = false,
  className,
}: {
  task: DeliveryTask;
  tasksById: Map<string, DeliveryTask>;
  assigneeLabel?: string | null;
  href?: string;
  onSelect?: (task: DeliveryTask) => void;
  selected?: boolean;
  className?: string;
}) {
  const dependencies = getTaskDependencyState(task, tasksById);
  const interactive = Boolean(onSelect || href);

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-on-surface">{task.title}</p>
          {task.roleKey && (
            <p className="mt-0.5 text-xs uppercase tracking-wide text-on-surface-variant">
              {task.roleKey.replace(/_/g, " ")}
            </p>
          )}
        </div>
        <StatusBadge status={task.status} />
      </div>

      {task.description && (
        <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
        {assigneeLabel !== undefined && (
          <span>
            {assigneeLabel ? `Assigned to ${assigneeLabel}` : "Unassigned"}
          </span>
        )}
        {toNumber(task.estimatedHours) !== null && (
          <span>{toNumber(task.estimatedHours)}h estimated</span>
        )}
        {toNumber(task.budgetAmount) !== null && task.currency && (
          <span>
            {formatMoney(toNumber(task.budgetAmount), task.currency)} allocated
          </span>
        )}
        {task.assignedAt && <span>Assigned {formatDate(task.assignedAt)}</span>}
      </div>

      {dependencies.locked && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-surface-container-high px-3 py-2 text-xs text-on-surface-variant">
          <Lock size={13} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            {dependencies.blockedBy.length
              ? `Blocked by ${dependencies.blockedBy.map((item) => item.title).join(", ")}`
              : "Blocked by dependencies that have not loaded"}
          </span>
        </p>
      )}
    </>
  );

  const shared = clsx(
    "block w-full rounded-xl border bg-surface-container-lowest p-4 text-left transition-colors",
    selected ? "border-primary-container" : "border-outline-variant/30",
    interactive &&
      "hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    className,
  );

  if (href) {
    return (
      <a href={href} className={shared}>
        {body}
      </a>
    );
  }

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(task)} className={shared}>
        {body}
      </button>
    );
  }

  return <div className={shared}>{body}</div>;
}

/**
 * Renders tasks with their dependency locks resolved against the full list, so
 * a task is only shown as unlocked when every dependency it declares is both
 * loaded and done.
 */
export function TaskList({
  tasks,
  allTasks,
  assigneeLabels,
  hrefForTask,
  onSelect,
  selectedTaskId,
  emptyLabel = "No tasks yet.",
  className,
}: {
  tasks: DeliveryTask[];
  /** Defaults to `tasks`. Pass the full project task list when rendering a subset. */
  allTasks?: DeliveryTask[];
  assigneeLabels?: Record<string, string | null>;
  hrefForTask?: (task: DeliveryTask) => string;
  onSelect?: (task: DeliveryTask) => void;
  selectedTaskId?: string | null;
  emptyLabel?: string;
  className?: string;
}) {
  const tasksById = indexTasksById(allTasks ?? tasks);

  if (!tasks.length) {
    return (
      <p className={clsx("text-sm text-on-surface-variant", className)}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          tasksById={tasksById}
          assigneeLabel={assigneeLabels?.[task.id]}
          href={hrefForTask?.(task)}
          onSelect={onSelect}
          selected={selectedTaskId === task.id}
        />
      ))}
    </div>
  );
}
