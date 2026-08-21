"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  getTaskMatchingRuns,
  startImplementationMatching,
  type TaskMatchingRun,
} from "@/services/implementation-matching";
import {
  getProjectSubmissions,
  getProjectPlans,
  materializeProjectPlan,
  type PlanningSubmission,
  type ProjectPlan,
} from "@/services/planning";

function latestByType(submissions: PlanningSubmission[], type: string) {
  return submissions
    .filter((submission) => submission.submissionType === type)
    .sort((left, right) => right.version - left.version)[0];
}

export function ImplementationMatchingPanel({
  projectId,
  taskCount,
  unassignedCount,
}: {
  projectId: string;
  taskCount: number;
  unassignedCount: number;
}) {
  const toast = useToast();
  const [runs, setRuns] = useState<TaskMatchingRun[]>([]);
  const [plans, setPlans] = useState<ProjectPlan[]>([]);
  const [submissions, setSubmissions] = useState<PlanningSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [runResult, planResult, submissionResult] = await Promise.allSettled([
      getTaskMatchingRuns(projectId, { limit: 100 }),
      getProjectPlans(projectId, { isCurrent: true, limit: 10 }),
      getProjectSubmissions(projectId, { limit: 100 }),
    ]);
    setRuns(runResult.status === "fulfilled" ? runResult.value.data ?? [] : []);
    setPlans(planResult.status === "fulfilled" ? planResult.value : []);
    setSubmissions(
      submissionResult.status === "fulfilled" ? submissionResult.value : [],
    );
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 15_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [load]);

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.isCurrent) ?? plans[0] ?? null,
    [plans],
  );
  const architecture = latestByType(submissions, "architecture");
  const uiux = latestByType(submissions, "ui_ux");

  const startMatching = async () => {
    setBusy(true);
    try {
      const result = await startImplementationMatching(projectId);
      toast.success(`Matching started for ${result.runs.length} task(s)`);
      await load();
    } catch (error) {
      toast.error(
        "Could not start implementation matching",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const recoverTasks = async () => {
    if (!currentPlan) return;
    setBusy(true);
    try {
      await materializeProjectPlan(currentPlan.id);
      toast.success("Tasks created and implementation matching started");
      await load();
    } catch (error) {
      toast.error(
        "Could not create tasks from the plan",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-on-surface-variant">Tracing the planning chain…</p>;
  }

  let explanation = "Implementation matching is operating normally.";
  if (taskCount === 0 && !architecture) {
    explanation = "Waiting for the architecture freelancer to submit work.";
  } else if (taskCount === 0 && architecture?.status !== "approved") {
    explanation = `Architecture is ${architecture.status.replaceAll("_", " ")}; the principal reviewer must approve it first.`;
  } else if (taskCount === 0 && !uiux) {
    explanation = "Architecture is approved. Waiting for the UI/UX submission.";
  } else if (taskCount === 0 && uiux.status !== "approved") {
    explanation = `UI/UX is ${uiux.status.replaceAll("_", " ")}; the principal reviewer must approve it first.`;
  } else if (taskCount === 0 && !currentPlan) {
    explanation = "Both planning artifacts are approved. Scrum plan generation is queued or needs recovery.";
  } else if (taskCount === 0 && currentPlan?.status === "generated") {
    explanation = "The Scrum plan is generated and waiting for principal reviewer approval.";
  } else if (taskCount === 0 && currentPlan?.status === "approved") {
    explanation = "The plan is approved but task creation did not finish. Automatic recovery will retry it.";
  } else if (taskCount > 0 && unassignedCount > 0 && runs.length === 0) {
    explanation = "Tasks exist, but no matching run was recorded. Start the recovery below.";
  } else if (taskCount > 0 && unassignedCount === 0) {
    explanation = "Every implementation task has an accepted assignee.";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-surface-container-low p-4">
        <p className="font-medium text-on-surface">{explanation}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <StatusBadge status={architecture?.status ?? "not_submitted"} />
          <span className="self-center text-on-surface-variant">Architecture</span>
          <StatusBadge status={uiux?.status ?? "not_submitted"} />
          <span className="self-center text-on-surface-variant">UI/UX</span>
          <StatusBadge status={currentPlan?.status ?? "not_generated"} />
          <span className="self-center text-on-surface-variant">Scrum plan</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {currentPlan?.status === "generated" && (
          <Link
            href={`/dashboard/admin/project-plans/${currentPlan.id}`}
            className="inline-flex items-center rounded-lg border border-outline-variant px-3 py-2 text-sm hover:bg-surface-container-low"
          >
            Inspect generated plan
          </Link>
        )}
        {taskCount === 0 && currentPlan?.status === "approved" && (
          <Button size="sm" loading={busy} onClick={() => void recoverTasks()}>
            <RefreshCw size={14} /> Recover task generation
          </Button>
        )}
        {taskCount > 0 && unassignedCount > 0 && (
          <Button size="sm" loading={busy} onClick={() => void startMatching()}>
            <Play size={14} /> Match {unassignedCount} unassigned task(s)
          </Button>
        )}
      </div>

      {runs.length > 0 && (
        <div className="space-y-2">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/dashboard/admin/matching/${run.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline-variant/40 px-3 py-2 text-sm hover:bg-surface-container-low"
            >
              <span>
                {run.taskTitle ?? "Implementation task"} · {run.candidateCount} candidate(s)
              </span>
              <StatusBadge status={run.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
