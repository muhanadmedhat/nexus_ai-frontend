"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, CalendarClock, ListChecks, Wallet, Sparkles, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { deleteProject, getProject } from "@/services/projects";
import { getBrief } from "@/services/brief";
import { PROJECT_DELETION_BLOCKED_STATUSES, type Brief, type Project } from "@/types/project";
import { formatBudget, formatDate } from "@/utils/format";

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const briefConfirmed = Boolean(brief?.confirmedAt);
  const briefComplete = Boolean(brief?.isComplete);
  const briefStarted = Boolean(brief && brief.completionPercent > 0);
  const requirementsActionLabel = briefConfirmed
    ? "View confirmed brief"
    : briefComplete
      ? "Review and confirm brief"
      : briefStarted
        ? "Continue requirements"
        : "Start requirements";
  const nextActionText = briefConfirmed
    ? "Your requirements are confirmed. Review the final price and fund escrow when you are ready."
    : briefComplete
      ? "The brief details are captured. Review and confirm them to generate the final price."
      : "Define your requirements with the AI agent.";
  const finalDeliveryReady =
    project?.automationStatus === "awaiting_client_acceptance";
  const projectCompleted = project?.status === "completed";

  useEffect(() => {
    if (!id || user?.role !== "customer") return;
    Promise.all([getProject(id), getBrief(id)])
      .then(([p, b]) => {
        setProject(p);
        setBrief(b);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load project"))
      .finally(() => setLoading(false));
  }, [id, user?.role]);

  const handleDeleteProject = async () => {
    if (!project || PROJECT_DELETION_BLOCKED_STATUSES.includes(project.status)) return;

    setDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success("Project deleted", `${project.title} was removed.`);
      router.replace("/projects");
    } catch (error) {
      toast.error(
        "Could not delete project",
        error instanceof Error ? error.message : "Please try again.",
      );
      setDeleting(false);
    }
  };

  return (
    <DashboardShell role="customer" title="Project details" subtitle="Overview, budget, and next steps.">
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to projects
      </Link>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading…</p>
      ) : loadError ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
          <h3 className="text-lg font-semibold text-on-surface">Could not load project</h3>
          <p className="mt-1 text-sm text-error">{loadError}</p>
        </div>
      ) : !project ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
          <h3 className="text-lg font-semibold text-on-surface">Project not found</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            It may have been removed, or the link is invalid.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="font-headline text-2xl font-semibold text-on-surface">
                  {project.title}
                </h2>
                <StatusBadge status={project.status} />
              </div>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                {project.description || "No description provided."}
              </p>

              <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-start gap-3">
                  <Wallet size={18} className="mt-0.5 text-outline" />
                  <div>
                    <dt className="text-xs text-on-surface-variant">Budget</dt>
                    <dd className="text-sm font-medium text-on-surface">{formatBudget(project)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarClock size={18} className="mt-0.5 text-outline" />
                  <div>
                    <dt className="text-xs text-on-surface-variant">Deadline</dt>
                    <dd className="text-sm font-medium text-on-surface">
                      {project.deadline ? formatDate(project.deadline) : "—"}
                      {project.isDeadlineFlexible && (
                        <span className="ml-1 text-xs text-on-surface-variant">(flexible)</span>
                      )}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles size={18} className="mt-0.5 text-outline" />
                  <div>
                    <dt className="text-xs text-on-surface-variant">Created</dt>
                    <dd className="text-sm font-medium text-on-surface">
                      {formatDate(project.createdAt)}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            {/* Brief status */}
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <h3 className="font-headline text-lg font-semibold text-on-surface">Requirements brief</h3>
              {brief && (brief.completionPercent > 0 || brief.isComplete) ? (
                <>
                  <p className="mt-1 text-sm text-on-surface-variant">{brief.summary}</p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-surface-container-high">
                    <div
                      className="h-1.5 rounded-full bg-primary-container"
                      style={{ width: `${brief.completionPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {brief.confirmedAt
                      ? "Brief confirmed"
                      : `${brief.completionPercent}% complete`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-on-surface-variant">
                  No brief yet. Start the requirements chat to define your project.
                </p>
              )}
            </div>

            {/* Sprint 4 Feature Sections */}
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow mt-6">
              <h3 className="font-headline text-lg font-semibold text-on-surface">Project Dashboard</h3>
              <p className="mt-1 mb-4 text-sm text-on-surface-variant">Manage your team assignments, deliverable goals, and project funding.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link href={`/projects/${project.id}/planning`} className="flex flex-col items-center justify-center rounded-lg border border-outline-variant/30 p-4 hover:border-primary transition-colors hover:bg-surface-container">
                  <CalendarClock className="mb-2 text-primary" size={24} />
                  <span className="text-sm font-medium">Planning</span>
                </Link>
                <Link href={`/projects/${project.id}/work`} className="flex flex-col items-center justify-center rounded-lg border border-outline-variant/30 p-4 hover:border-primary transition-colors hover:bg-surface-container">
                  <ListChecks className="mb-2 text-primary" size={24} />
                  <span className="text-sm font-medium">Delivery</span>
                </Link>
                <Link href={`/projects/${project.id}/team`} className="flex flex-col items-center justify-center rounded-lg border border-outline-variant/30 p-4 hover:border-primary transition-colors hover:bg-surface-container">
                  <Sparkles className="mb-2 text-primary" size={24} />
                  <span className="text-sm font-medium">Team</span>
                </Link>
                <Link href={`/projects/${project.id}/payments`} className="flex flex-col items-center justify-center rounded-lg border border-outline-variant/30 p-4 hover:border-primary transition-colors hover:bg-surface-container">
                  <Wallet className="mb-2 text-primary" size={24} />
                  <span className="text-sm font-medium">Payments</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar: next action */}
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <h3 className="font-headline text-base font-semibold text-on-surface">Next action</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                {projectCompleted
                  ? "Your delivery was accepted. You can revisit the final build and team ratings."
                  : finalDeliveryReady
                    ? "The integrated project passed final review and is waiting for your acceptance."
                    : nextActionText}
              </p>
              <Link
                href={
                  finalDeliveryReady || projectCompleted
                    ? `/projects/${project.id}/work`
                    : `/projects/${project.id}/requirements`
                }
              >
                <Button className="mt-4 inline-flex w-full items-center justify-center">
                  {finalDeliveryReady || projectCompleted ? (
                    <ListChecks size={18} className="mr-2" />
                  ) : (
                    <MessageSquare size={18} className="mr-2" />
                  )}
                  {projectCompleted
                    ? "View completed delivery"
                    : finalDeliveryReady
                      ? "Review final delivery"
                      : requirementsActionLabel}
                </Button>
              </Link>
              {briefConfirmed && (
                <Link href={`/projects/${project.id}/payments`}>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 inline-flex w-full items-center justify-center"
                  >
                    <Wallet size={18} className="mr-2" />
                    View final price
                  </Button>
                </Link>
              )}
            </div>

            <div className="rounded-xl border border-error/20 bg-surface-container-lowest p-6 card-shadow">
              <h3 className="font-headline text-base font-semibold text-on-surface">Delete project</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Remove this project while it is still unassigned.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
                loading={deleting}
                disabled={PROJECT_DELETION_BLOCKED_STATUSES.includes(project.status)}
                className="mt-4 inline-flex items-center justify-center border-error/30 px-4 py-2.5 text-error hover:bg-error/5"
              >
                <Trash2 size={18} className="mr-2" />
                Delete project
              </Button>
              {PROJECT_DELETION_BLOCKED_STATUSES.includes(project.status) && (
                <p className="mt-2 text-xs text-on-surface-variant">
                  Projects cannot be deleted after they are assigned to freelancers.
                </p>
              )}
            </div>
          </div>
          <ConfirmDialog
            open={isDeleteDialogOpen}
            title="Delete project?"
            description={`This will remove "${project.title}" from your projects.`}
            confirmLabel="Delete project"
            loading={deleting}
            danger
            onCancel={() => {
              if (!deleting) setIsDeleteDialogOpen(false);
            }}
            onConfirm={handleDeleteProject}
          />
        </div>
      )}
    </DashboardShell>
  );
}
