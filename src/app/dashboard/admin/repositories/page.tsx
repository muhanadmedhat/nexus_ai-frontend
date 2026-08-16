"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { getAdminProjects, type AdminProjectSummary } from "@/services/admin";
import {
  createProjectRepository,
  getAdminRepositories,
  getProjectRepository,
  resendCollaboratorInvite,
  syncRepositoryCollaborators,
  syncRepositoryEvaluationWebhook,
  type AdminProjectRepository,
  type RepositoryCollaborator,
} from "@/services/repositories";

const STATUS_FILTERS = [
  "all",
  "active",
  "pending",
  "failed",
  "archived",
] as const;

// Projects far enough along to own an implementation repository.
const REPOSITORY_READY_STATUSES = [
  "implementation_ready",
  "matching",
  "matched",
  "assigned",
  "active",
  "under_review",
];

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

export default function AdminRepositoriesPage() {
  const toast = useToast();
  const [repositories, setRepositories] = useState<AdminProjectRepository[]>(
    [],
  );
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<RepositoryCollaborator[]>(
    [],
  );
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [projects, setProjects] = useState<AdminProjectSummary[]>([]);
  const [newProjectId, setNewProjectId] = useState("");
  const [creating, setCreating] = useState(false);

  // Callers flip `loading` before invoking this, so the effect below never
  // triggers a synchronous state update.
  const loadRepositories = useCallback(async () => {
    try {
      const response = await getAdminRepositories({
        status: status === "all" ? undefined : status,
        limit: 50,
      });
      setRepositories(response.data ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load repositories",
      );
    } finally {
      setLoading(false);
    }
  }, [toast, status]);

  useEffect(() => {
    // The fetch only updates state after its await, so it does not cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRepositories();
  }, [loadRepositories]);

  const refresh = () => {
    setLoading(true);
    void loadRepositories();
  };

  useEffect(() => {
    getAdminProjects({ limit: 100 })
      .then((response) =>
        setProjects(
          (response.data ?? []).filter((project) =>
            REPOSITORY_READY_STATUSES.includes(project.status),
          ),
        ),
      )
      .catch(() => setProjects([]));
  }, []);

  const handleCreate = async () => {
    if (!newProjectId) return;

    setCreating(true);
    try {
      const repository = await createProjectRepository(newProjectId);
      if (repository.status === "failed") {
        toast.error("GitHub creation failed", repository.error ?? undefined);
      } else {
        toast.success(`${repository.owner}/${repository.repoName} is ready`);
      }
      setNewProjectId("");
      refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create the repository",
      );
    } finally {
      setCreating(false);
    }
  };

  const loadCollaborators = useCallback(
    async (projectId: string) => {
      setCollaboratorsLoading(true);
      try {
        const detail = await getProjectRepository(projectId);
        setCollaborators(detail.collaborators ?? []);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load collaborators",
        );
      } finally {
        setCollaboratorsLoading(false);
      }
    },
    [toast],
  );

  const toggleRepository = async (repository: AdminProjectRepository) => {
    if (openId === repository.id) {
      setOpenId(null);
      setCollaborators([]);
      return;
    }
    setOpenId(repository.id);
    setCollaborators([]);
    await loadCollaborators(repository.projectId);
  };

  const handleSync = async (repository: AdminProjectRepository) => {
    setBusyId(repository.id);
    try {
      const result = await syncRepositoryCollaborators(repository.projectId, {
        includeTaskAssignees: true,
      });
      setCollaborators(result.collaborators ?? []);
      toast.success(
        `${result.invited} invited`,
        result.missingUsername
          ? `${result.missingUsername} freelancer(s) have no GitHub username yet`
          : undefined,
      );
      await loadRepositories();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not sync collaborators",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleResend = async (collaborator: RepositoryCollaborator) => {
    setBusyId(collaborator.id);
    try {
      const updated = await resendCollaboratorInvite(collaborator.id);
      setCollaborators((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      toast.success("Invite sent again");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not resend the invite",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleWebhookSync = async (repository: AdminProjectRepository) => {
    setBusyId(`${repository.id}:webhook`);
    try {
      const updated = await syncRepositoryEvaluationWebhook(
        repository.projectId,
      );
      if (updated.evaluationWebhook?.status === "active") {
        toast.success("Evaluation webhook is active");
      } else {
        toast.error(
          "Webhook sync failed",
          updated.evaluationWebhook?.error ?? "Check the GitHub configuration.",
        );
      }
      await loadRepositories();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not sync the webhook",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardShell
      role="admin"
      title="Repositories"
      subtitle="Nexus-owned GitHub repositories and their collaborator invites."
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
        <label
          htmlFor="new-repository-project"
          className="text-sm text-on-surface-variant"
        >
          Create a repository for
        </label>
        <select
          id="new-repository-project"
          value={newProjectId}
          onChange={(event) => setNewProjectId(event.target.value)}
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
          loading={creating}
          disabled={!newProjectId}
          onClick={() => void handleCreate()}
        >
          <Plus size={15} /> Create
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Loader2 className="animate-spin" size={18} /> Loading repositories...
        </div>
      ) : repositories.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
          No repositories yet. Create one from a project once it is
          implementation ready.
        </div>
      ) : (
        <div className="space-y-3">
          {repositories.map((repository) => (
            <div
              key={repository.id}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button
                  onClick={() => void toggleRepository(repository)}
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                >
                  {openId === repository.id ? (
                    <ChevronDown size={16} className="mt-1 shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="mt-1 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-headline font-semibold text-on-surface">
                      {repository.owner}/{repository.repoName}
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {repository.projectTitle ?? repository.projectId} ·{" "}
                      {repository.collaboratorCount} collaborators
                      {repository.missingUsernameCount > 0
                        ? ` · ${repository.missingUsernameCount} missing username`
                        : ""}{" "}
                      · synced {formatDate(repository.lastSyncedAt)}
                      {` · evaluation webhook ${repository.evaluationWebhook?.status ?? "not synced"}`}
                    </p>
                    {repository.error && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-error">
                        <AlertCircle size={14} /> {repository.error}
                      </p>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <StatusBadge status={repository.status} />
                  <a
                    href={repository.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low"
                  >
                    <ExternalLink size={15} /> Open
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busyId === `${repository.id}:webhook`}
                    disabled={repository.status !== "active"}
                    onClick={() => void handleWebhookSync(repository)}
                  >
                    <RefreshCw size={15} /> Webhook
                  </Button>
                  <Button
                    size="sm"
                    loading={busyId === repository.id}
                    disabled={repository.status !== "active"}
                    onClick={() => void handleSync(repository)}
                  >
                    <Users size={15} /> Sync
                  </Button>
                </div>
              </div>

              {openId === repository.id && (
                <div className="border-t border-outline-variant p-4">
                  {collaboratorsLoading ? (
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Loader2 className="animate-spin" size={16} /> Loading
                      collaborators...
                    </div>
                  ) : collaborators.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">
                      No collaborators yet. Use Sync to invite the assigned
                      freelancers.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {collaborators.map((collaborator) => (
                        <div
                          key={collaborator.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-headline font-semibold text-on-surface">
                              {collaborator.freelancerName ?? "Freelancer"}
                            </p>
                            <p className="text-sm text-on-surface-variant">
                              {collaborator.githubUsername
                                ? `@${collaborator.githubUsername}`
                                : "No GitHub username saved"}{" "}
                              · {collaborator.permission}
                            </p>
                            {collaborator.error && (
                              <p className="mt-1 text-sm text-error">
                                {collaborator.error}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={collaborator.inviteStatus} />
                            <Button
                              size="sm"
                              variant="outline"
                              loading={busyId === collaborator.id}
                              disabled={
                                collaborator.inviteStatus === "accepted"
                              }
                              onClick={() => void handleResend(collaborator)}
                            >
                              <Send size={15} /> Resend
                            </Button>
                          </div>
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
