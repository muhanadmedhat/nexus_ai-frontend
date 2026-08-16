"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckSquare, Loader2, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TaskList } from "@/components/delivery";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getMyFreelancerTasks } from "@/services/planning";
import type { UserRole } from "@/types/auth";
import type { DeliveryTask } from "@/types/delivery";

type TaskFilter = "all" | "active" | "review" | "done";

const FILTERS: Array<{ key: TaskFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "review", label: "Review" },
  { key: "done", label: "Approved" },
];

function matchesFilter(task: DeliveryTask, filter: TaskFilter) {
  if (filter === "active") {
    return ["todo", "blocked", "in_progress", "changes_requested"].includes(
      task.status,
    );
  }
  if (filter === "review") return task.status === "review";
  if (filter === "done") return task.status === "done";
  return true;
}

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const role = (user?.role ?? "customer") as UserRole;
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);

    try {
      const assigned = await getMyFreelancerTasks({ limit: 100 });
      setTasks(assigned as DeliveryTask[]);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your assigned tasks",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || user?.role !== "freelancer") {
      return;
    }

    const initialTimeoutId = window.setTimeout(() => void loadTasks(), 0);
    const intervalId = window.setInterval(() => void loadTasks(true), 20_000);
    const handleFocus = () => void loadTasks(true);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [authLoading, loadTasks, user?.role]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => matchesFilter(task, filter)),
    [filter, tasks],
  );
  const projectGroups = useMemo(() => {
    const groups = new Map<
      string,
      { title: string; projectId: string; tasks: DeliveryTask[] }
    >();

    for (const task of visibleTasks) {
      const group = groups.get(task.projectId) ?? {
        title: task.project?.title ?? "Assigned project",
        projectId: task.projectId,
        tasks: [],
      };
      group.tasks.push(task);
      groups.set(task.projectId, group);
    }
    return Array.from(groups.values());
  }, [visibleTasks]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      active: tasks.filter((task) => matchesFilter(task, "active")).length,
      review: tasks.filter((task) => matchesFilter(task, "review")).length,
      done: tasks.filter((task) => matchesFilter(task, "done")).length,
    }),
    [tasks],
  );

  return (
    <DashboardShell
      role={role}
      title="Tasks"
      subtitle="Track your assigned tasks and deliverables."
    >
      {role !== "freelancer" ? (
        <EmptyTasks
          title={
            role === "admin" ? "No personal task queue" : "No tasks yet"
          }
          description={
            role === "admin"
              ? "Review project tasks from the admin delivery workspace."
              : "Tasks will appear after your project plan is approved."
          }
        />
      ) : loading ? (
        <div className="flex items-center justify-center py-20 text-on-surface-variant">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading assigned tasks…
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    filter === item.key
                      ? "bg-primary-container text-on-primary"
                      : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {item.label} {counts[item.key]}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="!w-auto"
              loading={refreshing}
              onClick={() => void loadTasks(true)}
            >
              <RefreshCw size={15} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/10 p-4 text-sm text-error">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Tasks could not be refreshed</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!projectGroups.length ? (
            <EmptyTasks
              title={
                tasks.length
                  ? "No tasks match this filter"
                  : "No tasks assigned yet"
              }
              description={
                tasks.length
                  ? "Choose another status to see the rest of your work."
                  : "Implementation tasks appear here as soon as an admin assigns them to you."
              }
            />
          ) : (
            projectGroups.map((group) => (
              <section
                key={group.projectId}
                className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-headline text-lg font-semibold text-on-surface">
                      {group.title}
                    </h2>
                    <p className="text-sm text-on-surface-variant">
                      {group.tasks.length} assigned {group.tasks.length === 1 ? "task" : "tasks"}
                    </p>
                  </div>
                  <Link
                    href={`/freelancer/projects/${group.projectId}`}
                    className="text-sm font-medium text-primary-container hover:text-primary"
                  >
                    View project
                  </Link>
                </div>
                <TaskList
                  tasks={group.tasks}
                  allTasks={tasks}
                  hrefForTask={(task) =>
                    `/freelancer/projects/${task.projectId}/tasks/${task.id}`
                  }
                />
              </section>
            ))
          )}
        </div>
      )}
    </DashboardShell>
  );
}

function EmptyTasks({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
        <CheckSquare size={32} className="text-outline" />
      </div>
      <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
      <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
    </div>
  );
}
