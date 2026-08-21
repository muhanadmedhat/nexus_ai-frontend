"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, GitBranch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  createProjectRepository,
  getProjectRepository,
  syncRepositoryCollaborators,
  type ProjectRepositoryDetail,
} from "@/services/repositories";

export function ProjectRepositoryPanel({ projectId }: { projectId: string }) {
  const toast = useToast();
  const [detail, setDetail] = useState<ProjectRepositoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await getProjectRepository(projectId));
      setError(null);
    } catch (loadError) {
      setDetail(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Repository status is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 15_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [load]);

  const provision = async () => {
    setBusy(true);
    try {
      const repository = await createProjectRepository(projectId);
      if (repository.status === "failed") {
        toast.error(
          "Repository provisioning failed",
          repository.error ?? "Check the GitHub integration configuration.",
        );
      } else {
        toast.success("Private project repository is ready");
      }
      await load();
    } catch (operationError) {
      toast.error(
        "Repository provisioning failed",
        operationError instanceof Error ? operationError.message : "Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    try {
      const result = await syncRepositoryCollaborators(projectId, {
        includePlanningAssignees: true,
        includeTaskAssignees: true,
      });
      toast.success(
        "Repository access synchronized",
        result.missingUsername
          ? `${result.missingUsername} assigned freelancer(s) still need to add a GitHub username.`
          : `${result.invited} collaborator invitation(s) are ready.`,
      );
      await load();
    } catch (operationError) {
      toast.error(
        "Could not synchronize access",
        operationError instanceof Error ? operationError.message : "Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-on-surface-variant">Checking GitHub provisioning…</p>;
  }

  if (!detail) {
    return (
      <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
        <div>
          <p className="font-medium text-on-surface">Repository not ready</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Automatic provisioning starts when the principal reviewer accepts. A
            missing GitHub username blocks only that person&apos;s collaborator invite,
            not matching or task generation.
          </p>
          {error && <p className="mt-2 text-xs text-error">{error}</p>}
        </div>
        <Button size="sm" loading={busy} onClick={() => void provision()}>
          <GitBranch size={15} /> Retry automatic provisioning
        </Button>
      </div>
    );
  }

  const { repository, collaborators } = detail;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-on-surface">
              {repository.owner}/{repository.repoName}
            </p>
            <StatusBadge status={repository.status} />
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">
            Evaluation webhook: {repository.evaluationWebhook?.status ?? "not configured"}
          </p>
          {repository.error && <p className="mt-1 text-xs text-error">{repository.error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" loading={busy} onClick={() => void sync()}>
            <RefreshCw size={14} /> Sync access
          </Button>
          <a
            href={repository.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low"
          >
            Open GitHub <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {collaborators.length > 0 ? (
        <div className="space-y-2">
          {collaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline-variant/40 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-on-surface">
                  {collaborator.freelancerName ?? "Assigned freelancer"}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {collaborator.githubUsername
                    ? `@${collaborator.githubUsername}`
                    : "GitHub username required from freelancer"}
                </p>
              </div>
              <StatusBadge status={collaborator.inviteStatus} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">
          The repository is ready. Collaborator invitations appear as planning or
          implementation assignments are accepted.
        </p>
      )}
    </div>
  );
}
