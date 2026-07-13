"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { deleteProject, listProjects } from "@/services/projects";
import { PROJECT_DELETION_BLOCKED_STATUSES, type Project } from "@/types/project";
import { formatBudget, formatDate } from "@/utils/format";

export default function ProjectsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const role = (user?.role || "customer") as "customer" | "freelancer" | "admin";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectPendingDelete, setProjectPendingDelete] = useState<Project | null>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.log('🔍 Error message:', message);
        
        // Check if the message indicates forbidden access
        if (message.includes("not allowed") || message.includes("forbidden") || message.includes("403")) {
          setLoadError("forbidden");
        } else {
          setLoadError(message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteProject = async () => {
    const project = projectPendingDelete;
    if (!project) return;
    if (PROJECT_DELETION_BLOCKED_STATUSES.includes(project.status)) return;

    setDeletingId(project.id);
    try {
      await deleteProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setProjectPendingDelete(null);
      toast.success("Project deleted", `${project.title} was removed.`);
    } catch (error) {
      toast.error(
        "Could not delete project",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Freelancer-specific empty state (when 403 or role is freelancer and projects empty)
  const showFreelancerEmptyState =
    loadError === "forbidden" ||
    (role === "freelancer" && !loading && !loadError && projects.length === 0);

  if (showFreelancerEmptyState) {
    return (
      <DashboardShell
        role="freelancer"
        title="Projects"
        subtitle="View and manage your assigned projects."
      >
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
            <FolderOpen size={32} className="text-outline" />
          </div>
          <h3 className="text-lg font-semibold text-on-surface">No assigned projects</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            As a freelancer, you'll see projects you're assigned to here.
            Complete your profile and get matched to start receiving tasks.
          </p>
          <Link href="/freelancer/verification">
            <Button className="mt-4 inline-flex w-auto px-6">
              Check verification status
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role={role} title="Projects" subtitle="View and manage all your projects.">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">
          {loading ? "Loading…" : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
        </p>
        {role === "customer" && (
          <Link href="/projects/new">
            <Button className="inline-flex w-auto px-5 py-2.5">
              <Plus size={18} className="mr-2" />
              New project
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-container border-t-transparent" />
        </div>
      ) : loadError && loadError !== "forbidden" ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center card-shadow">
          <p className="text-sm text-error">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-primary-container px-4 py-2 text-on-primary"
          >
            Retry
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
            <FolderOpen size={32} className="text-outline" />
          </div>
          <h3 className="text-lg font-semibold text-on-surface">No projects yet</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Create your first project and let Nexus AI handle the rest.
          </p>
          {role === "customer" && (
            <Link href="/projects/new">
              <Button className="mt-4 inline-flex w-auto px-6">
                <Plus size={18} className="mr-2" />
                Create your first project
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const deleteBlocked = PROJECT_DELETION_BLOCKED_STATUSES.includes(p.status);
              const deleting = deletingId === p.id;

              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow transition-all hover:border-primary-container/50"
                >
                  <Link href={`/projects/${p.id}`} className="block">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="font-headline text-base font-semibold text-on-surface">{p.title}</h3>
                      <StatusBadge status={p.status} />
                    </div>
                    {p.description && (
                      <p className="mb-4 line-clamp-2 text-sm text-on-surface-variant">{p.description}</p>
                    )}
                    <dl className="space-y-1.5 text-xs text-on-surface-variant">
                      <div className="flex justify-between">
                        <dt>Budget</dt>
                        <dd className="text-on-surface">{formatBudget(p)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Deadline</dt>
                        <dd className="text-on-surface">{p.deadline ? formatDate(p.deadline) : "—"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Created</dt>
                        <dd className="text-on-surface">{formatDate(p.createdAt)}</dd>
                      </div>
                    </dl>
                  </Link>
                  {(role === "customer" || role === "admin") && (
                    <button
                      type="button"
                      onClick={() => setProjectPendingDelete(p)}
                      disabled={deleteBlocked || deleting}
                      title={
                        deleteBlocked
                          ? "Projects cannot be deleted after assignment"
                          : "Delete project"
                      }
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-error/20 px-3 py-2 text-sm font-semibold text-error transition-colors hover:bg-error/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <ConfirmDialog
            open={Boolean(projectPendingDelete)}
            title="Delete project?"
            description={
              projectPendingDelete
                ? `This will remove "${projectPendingDelete.title}" from your projects.`
                : ""
            }
            confirmLabel="Delete project"
            loading={Boolean(projectPendingDelete && deletingId === projectPendingDelete.id)}
            danger
            onCancel={() => {
              if (!deletingId) setProjectPendingDelete(null);
            }}
            onConfirm={handleDeleteProject}
          />
        </>
      )}
    </DashboardShell>
  );
}