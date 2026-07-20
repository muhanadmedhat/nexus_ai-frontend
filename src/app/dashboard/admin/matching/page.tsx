"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Loader2,
  Search,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminMatchingRuns } from "@/services/admin";
import type { MatchingRun } from "@/services/matching";

type AdminMatchingRun = MatchingRun & { projectTitle?: string | null };

interface ProjectWorkflow {
  projectId: string;
  projectTitle: string;
  runs: AdminMatchingRun[];
  architectRun?: AdminMatchingRun;
  uiuxRun?: AdminMatchingRun;
  latestRun: AdminMatchingRun;
}

const roleLabels: Record<string, string> = {
  architect: "Architect",
  architecture: "Architect",
  ui_ux: "UI/UX",
  uiux: "UI/UX",
  designer: "UI/UX",
};

function roleLabel(role?: string | null) {
  if (!role) return "Planning role";
  return roleLabels[role] ?? role.replace(/_/g, " ");
}

function isApproved(run?: AdminMatchingRun) {
  return (
    run?.status === "approved" ||
    (run?.status === "reviewed" && Boolean(run.selectedCandidateId))
  );
}

function isWorking(run?: AdminMatchingRun) {
  return run?.status === "queued" || run?.status === "running";
}

function stepTone(done: boolean, active: boolean, locked = false) {
  if (done) {
    return "border-primary-container bg-primary-container text-on-primary";
  }
  if (active) {
    return "border-primary-container bg-primary-container/10 text-primary-container";
  }
  if (locked) {
    return "border-outline-variant bg-surface-container-high text-outline";
  }
  return "border-outline-variant bg-surface-container-lowest text-on-surface-variant";
}

function WorkflowDots({ project }: { project: ProjectWorkflow }) {
  const architectDone = isApproved(project.architectRun);
  const uiuxLocked = !architectDone;
  const uiuxDone = isApproved(project.uiuxRun);
  const submissionsUnlocked = architectDone && uiuxDone;

  const steps = [
    {
      label: "Architect",
      done: architectDone,
      active: Boolean(project.architectRun) && !architectDone,
      locked: false,
    },
    {
      label: "UI/UX",
      done: uiuxDone,
      active: Boolean(project.uiuxRun) && architectDone && !uiuxDone,
      locked: uiuxLocked,
    },
    {
      label: "Submissions",
      done: false,
      active: submissionsUnlocked,
      locked: !submissionsUnlocked,
    },
    {
      label: "Scrum plan",
      done: false,
      active: false,
      locked: true,
    },
    {
      label: "Escrow",
      done: false,
      active: false,
      locked: true,
    },
  ];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-2">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${stepTone(
              step.done,
              step.active,
              step.locked,
            )}`}
          >
            {step.done ? <CheckCircle2 size={15} /> : index + 1}
          </span>
          <span
            className={
              step.done || step.active
                ? "text-xs font-semibold text-on-surface"
                : "text-xs font-medium text-on-surface-variant"
            }
          >
            {step.label}
          </span>
          {index < steps.length - 1 ? (
            <span className="hidden h-px w-8 bg-outline-variant/50 sm:block" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function groupRunsByProject(runs: AdminMatchingRun[]): ProjectWorkflow[] {
  const map = new Map<string, AdminMatchingRun[]>();

  for (const run of runs) {
    const current = map.get(run.projectId) ?? [];
    current.push(run);
    map.set(run.projectId, current);
  }

  return Array.from(map.entries())
    .map(([projectId, projectRuns]) => {
      const sortedRuns = [...projectRuns].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const findRole = (...roles: string[]) =>
        sortedRuns.find((run) =>
          roles.includes(String(run.targetRoleKey ?? "").toLowerCase()),
        );

      return {
        projectId,
        projectTitle:
          sortedRuns.find((run) => run.projectTitle)?.projectTitle ??
          `Project ${projectId.slice(0, 8)}`,
        runs: sortedRuns,
        architectRun: findRole("architect", "architecture"),
        uiuxRun: findRole("ui_ux", "uiux", "designer"),
        latestRun: sortedRuns[0],
      };
    })
    .sort(
      (a, b) =>
        new Date(b.latestRun.createdAt).getTime() -
        new Date(a.latestRun.createdAt).getTime(),
    );
}

export default function AdminMatchingQueue() {
  const [runs, setRuns] = useState<AdminMatchingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminMatchingRuns({ limit: 100 })
      .then((res) =>
        setRuns(
          Array.isArray(res.data)
            ? (res.data as unknown as AdminMatchingRun[])
            : [],
        ),
      )
      .catch((err) => {
        setRuns([]);
        setError(err instanceof Error ? err.message : "Could not load projects");
      })
      .finally(() => setLoading(false));
  }, []);

  const projects = useMemo(() => groupRunsByProject(runs), [runs]);
  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(
      (project) =>
        project.projectTitle.toLowerCase().includes(term) ||
        project.projectId.toLowerCase().includes(term),
    );
  }, [projects, search]);

  return (
    <DashboardShell
      role="admin"
      title="Project Workflows"
      subtitle="Move each project through planning role selection, review, Scrum planning, and escrow."
    >
      <div className="mb-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-container">
              <LayoutDashboard size={16} />
              Admin project flow
            </div>
            <h2 className="mt-2 font-headline text-2xl font-semibold text-on-surface">
              Review by project, not by raw agent run
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-on-surface-variant">
              Choose the architect first, unlock UI/UX, then review deliverables
              and let the Scrum Master prepare the implementation plan.
            </p>
          </div>
          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects..."
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 text-sm text-on-surface outline-none focus:border-primary-container"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          {error}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center text-on-surface-variant">
          No projects are waiting in this workflow.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const architectDone = isApproved(project.architectRun);
            const uiuxDone = isApproved(project.uiuxRun);
            const activeRun =
              !architectDone && project.architectRun
                ? project.architectRun
                : architectDone && !uiuxDone && project.uiuxRun
                  ? project.uiuxRun
                  : project.latestRun;

            return (
              <Link
                key={project.projectId}
                href={`/dashboard/admin/matching/${activeRun.id}`}
                className="block rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow transition hover:-translate-y-0.5 hover:border-primary-container/40 hover:bg-surface-container-low"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-headline text-xl font-semibold text-on-surface">
                        {project.projectTitle}
                      </h3>
                      <StatusBadge status={project.latestRun.status} />
                    </div>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {project.projectId}
                    </p>
                    <WorkflowDots project={project} />
                  </div>

                  <div className="grid min-w-full gap-3 sm:grid-cols-3 xl:min-w-[460px]">
                    <div className="rounded-lg bg-surface-container-low p-3">
                      <p className="text-xs text-on-surface-variant">Architect</p>
                      <p className="mt-1 text-sm font-semibold text-on-surface">
                        {project.architectRun
                          ? `${project.architectRun.candidateCount} candidates`
                          : "Not queued"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-container-low p-3">
                      <p className="text-xs text-on-surface-variant">UI/UX</p>
                      <p className="mt-1 text-sm font-semibold text-on-surface">
                        {project.uiuxRun
                          ? `${project.uiuxRun.candidateCount} candidates`
                          : "Locked"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-container-low p-3">
                      <p className="text-xs text-on-surface-variant">Next action</p>
                      <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-primary-container">
                        {roleLabel(activeRun.targetRoleKey)}
                        {isWorking(activeRun) ? (
                          <Clock3 size={14} />
                        ) : (
                          <ArrowRight size={14} />
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
