import type { DeliveryTask, TaskDependency } from "@/types/delivery";

/**
 * Postgres numeric columns arrive as strings ("72.00", "2500.00"), so amounts
 * and scores must be parsed before they are compared or formatted.
 */
export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function indexTasksById(tasks: DeliveryTask[]): Map<string, DeliveryTask> {
  return new Map(tasks.map((task) => [task.id, task]));
}

/**
 * The tasks endpoint returns dependencies as join rows
 * ({ taskId, dependsOnTaskId, ... }), so the id we need is `dependsOnTaskId`.
 * Bare id strings are tolerated too, in case a caller passes a flattened list.
 */
export function dependencyTaskIds(
  dependencies: DeliveryTask["dependencies"] | string[] | null | undefined,
): string[] {
  if (!Array.isArray(dependencies)) return [];

  return dependencies
    .map((dependency) => {
      if (typeof dependency === "string") return dependency;
      const row = dependency as TaskDependency;
      return row?.dependsOnTaskId ?? null;
    })
    .filter((id): id is string => Boolean(id));
}

/**
 * jsonb acceptance criteria. Normally an array of strings, but the column
 * permits an object, so both are flattened to a list of readable lines.
 */
export function acceptanceCriteriaList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === "string" ? entry : String(entry)));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const items = record.items ?? record.criteria;
    if (Array.isArray(items)) {
      return items.map((entry) => (typeof entry === "string" ? entry : String(entry)));
    }
    return Object.values(record).map((entry) =>
      typeof entry === "string" ? entry : String(entry),
    );
  }
  return [String(value)];
}

export interface TaskDependencyState {
  locked: boolean;
  /** Dependency tasks that are not done yet. */
  blockedBy: DeliveryTask[];
  /** Dependency ids we could not resolve against the supplied task list. */
  unresolvedIds: string[];
}

/**
 * A task cannot move to in_progress until every dependency task is done.
 * Dependencies the caller did not load are reported separately rather than
 * being treated as satisfied — a missing dependency must never silently unlock
 * a task.
 */
export function getTaskDependencyState(
  task: DeliveryTask,
  tasksById: Map<string, DeliveryTask>,
): TaskDependencyState {
  const dependencyIds = dependencyTaskIds(task.dependencies);
  const blockedBy: DeliveryTask[] = [];
  const unresolvedIds: string[] = [];

  for (const id of dependencyIds) {
    const dependency = tasksById.get(id);
    if (!dependency) {
      unresolvedIds.push(id);
      continue;
    }
    if (dependency.status !== "done") blockedBy.push(dependency);
  }

  return {
    locked: blockedBy.length > 0 || unresolvedIds.length > 0,
    blockedBy,
    unresolvedIds,
  };
}

export function isTaskLocked(
  task: DeliveryTask,
  tasksById: Map<string, DeliveryTask>,
): boolean {
  return getTaskDependencyState(task, tasksById).locked;
}

/**
 * The three rules from the Sprint 5 contract that disable submission.
 * Re-checked server side; this only keeps the UI honest.
 */
export function canSubmitTask(options: {
  task: DeliveryTask;
  tasksById: Map<string, DeliveryTask>;
  currentFreelancerProfileId: string | null | undefined;
  isAdmin?: boolean;
}): { allowed: boolean; reason: string | null } {
  const { task, tasksById, currentFreelancerProfileId, isAdmin = false } = options;

  if (task.status === "done") {
    return { allowed: false, reason: "This task is already approved and closed." };
  }

  if (!isAdmin) {
    // Never let an unknown viewer match an unassigned task: null === null
    // would otherwise grant submit rights on every unassigned task.
    if (!currentFreelancerProfileId) {
      return { allowed: false, reason: "We could not confirm your freelancer profile." };
    }
    if (task.assignedFreelancerProfileId !== currentFreelancerProfileId) {
      return { allowed: false, reason: "This task is assigned to another freelancer." };
    }
  }

  const dependencies = getTaskDependencyState(task, tasksById);
  if (dependencies.locked) {
    const names = dependencies.blockedBy.map((dependency) => dependency.title);
    return {
      allowed: false,
      reason: names.length
        ? `Waiting on ${names.join(", ")} to be approved first.`
        : "Waiting on dependency tasks that have not loaded yet.",
    };
  }

  return { allowed: true, reason: null };
}
