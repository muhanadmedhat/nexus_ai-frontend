"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { getAdminProjects, type AdminProjectSummary } from "@/services/admin";
import {
  assignTask,
  getAdminTaskMatchingRuns,
  startImplementationMatching,
  type AdminTaskMatchingRun,
} from "@/services/implementation-matching";
import { getRunDetail, type RunDetail } from "@/services/matching";

const STATUS_FILTERS = ["all", "running", "completed", "reviewed", "failed"] as const;

// Matching can only start once the Scrum plan has been materialized into tasks.
const MATCHABLE_PROJECT_STATUSES = [
  "implementation_ready",
  "ready_for_implementation_funding",
  "matching",
  "matched",
  "assigned",
  "active",
];

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function roleLabel(role?: string | null) {
  return role ? role.replace(/_/g, " ") : "Implementation";
}

export default function AdminImplementationMatchingPage() {
  const toast = useToast();
  const [runs, setRuns] = useState<AdminTaskMatchingRun[]>([]);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [projects, setProjects] = useState<AdminProjectSummary[]>([]);
  const [startProjectId, setStartProjectId] = useState("");
  const [starting, setStarting] = useState(false);

  // Callers flip `loading` before invoking this, so the effect below never
  // triggers a synchronous state update.
  const loadRuns = useCallback(async () => {
    try {
      const response = await getAdminTaskMatchingRuns({
        status: status === "all" ? undefined : status,
        limit: 50,
      });
      setRuns(response.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load runs");
    } finally {
      setLoading(false);
    }
  }, [toast, status]);

  useEffect(() => {
    // The fetch only updates state after its await, so it does not cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRuns();
  }, [loadRuns]);

  const refresh = () => {
    setLoading(true);
    void loadRuns();
  };

  useEffect(() => {
    getAdminProjects({ limit: 100 })
      .then((response) =>
        setProjects(
          (response.data ?? []).filter((project) =>
            MATCHABLE_PROJECT_STATUSES.includes(project.status),
          ),
        ),
      )
      .catch(() => setProjects([]));
  }, []);

  // No taskIds and no milestoneId means "match every unassigned task".
  const handleStart = async () => {
    if (!startProjectId) return;

    setStarting(true);
    try {
      const result = await startImplementationMatching(startProjectId);
      toast.success(`Started matching for ${result.runs.length} task(s)`);
      setStartProjectId("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start matching");
    } finally {
      setStarting(false);
    }
  };

  const toggleRun = async (runId: string) => {
    if (openRunId === runId) {
      setOpenRunId(null);
      setDetail(null);
      return;
    }

    setOpenRunId(runId);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await getRunDetail(runId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load candidates");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAssign = async (
    run: AdminTaskMatchingRun,
    candidateId: string,
  ) => {
    if (!run.targetTaskId) return;

    setAssigningId(candidateId);
    try {
      await assignTask(run.targetTaskId, {
        candidateId,
        sourceMatchingRunId: run.id,
      });
      toast.success("Freelancer assigned to the task");
      setOpenRunId(null);
      setDetail(null);
      setLoading(true);
      await loadRuns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign the task");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <DashboardShell
      role="admin"
      title="Implementation Matching"
      subtitle="Ranked candidates per implementation task. Assign one to give the task an owner."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item}
            onClick={() => {
              setStatus(item);
              setLoading(true);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize transition-colors ${
              status === item
                ? "border-primary-container bg-primary-container/10 text-primary-container"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            {item}
          </button>
        ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => refresh()}>
          <RefreshCw size={15} /> Refresh
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <label htmlFor="start-matching-project" className="text-sm text-on-surface-variant">
          Match unassigned tasks for
        </label>
        <select
          id="start-matching-project"
          value={startProjectId}
          onChange={(event) => setStartProjectId(event.target.value)}
          className="min-w-56 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface"
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          loading={starting}
          disabled={!startProjectId}
          onClick={() => void handleStart()}
        >
          <Play size={15} /> Start matching
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Loader2 className="animate-spin" size={18} /> Loading runs...
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
          No implementation task matching runs yet. Start matching from a project once its
          Scrum plan is materialized.
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest"
            >
              <button
                onClick={() => void toggleRun(run.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {openRunId === run.id ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    <span className="truncate font-headline font-semibold text-on-surface">
                      {run.taskTitle ?? "Implementation task"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {run.projectTitle ?? run.projectId} · {roleLabel(run.targetRoleKey)} ·{" "}
                    {run.candidateCount} candidates · {formatDate(run.createdAt)}
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </button>

              {openRunId === run.id && (
                <div className="border-t border-outline-variant p-4">
                  {detailLoading ? (
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Loader2 className="animate-spin" size={16} /> Loading candidates...
                    </div>
                  ) : !detail || detail.candidates.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">
                      {detail?.error ?? "No candidates were ranked for this task."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {detail.summary && (
                        <p className="text-sm text-on-surface-variant">{detail.summary}</p>
                      )}
                      {detail.candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-headline font-semibold text-on-surface">
                              #{candidate.rank} {candidate.freelancer?.name ?? "Freelancer"} ·{" "}
                              {Number(candidate.score).toFixed(1)}
                            </p>
                            <p className="mt-1 text-sm text-on-surface-variant">
                              {candidate.rationale}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            loading={assigningId === candidate.id}
                            disabled={candidate.status === "assigned"}
                            onClick={() => void handleAssign(run, candidate.id)}
                          >
                            <UserCheck size={15} />
                            {candidate.status === "assigned" ? "Assigned" : "Assign"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
