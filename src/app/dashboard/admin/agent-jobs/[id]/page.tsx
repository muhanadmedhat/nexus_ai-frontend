"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getAgentJobDetail, retryAgentJob, type AgentJob } from "@/services/admin";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
      <h3 className="font-headline text-lg font-semibold text-on-surface">{title}</h3>
      <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </section>
  );
}

export default function AdminAgentJobDetailPage() {
  const router = useRouter();
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<AgentJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJob(await getAgentJobDetail(params.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load agent job");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const handleRetry = async () => {
    if (!job) return;
    setRetrying(true);
    setError(null);
    try {
      const retried = await retryAgentJob(job.id);
      setJob(retried);
      toast.success("Agent job queued", "The worker will retry it now.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not retry agent job";
      setError(message);
      toast.error("Retry failed", message);
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadJob();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadJob]);

  if (loading) {
    return (
      <DashboardShell role="admin" title="Agent Job" subtitle="Loading job details...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      </DashboardShell>
    );
  }

  if (!job) {
    return (
      <DashboardShell role="admin" title="Agent Job" subtitle="Could not load job">
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          {error || "Agent job not found"}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role="admin"
      title="Agent Job"
      subtitle={`${job.jobType} · ${job.status}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/admin/agents")}
          className="!w-auto px-3 py-2 text-sm"
        >
          <ArrowLeft size={16} />
          Back to agents
        </Button>
        {job.status === "failed" ? (
          <Button
            type="button"
            loading={retrying}
            onClick={() => void handleRetry()}
            className="!w-auto px-4 py-2 text-sm"
          >
            <RefreshCw size={16} />
            Retry job
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-error/30 bg-error-container/10 p-4 text-sm text-error">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 text-sm card-shadow md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-on-surface-variant">Status</p>
          <p className="mt-1 font-semibold text-on-surface">{job.status}</p>
        </div>
        <div>
          <p className="text-on-surface-variant">Attempts</p>
          <p className="mt-1 font-semibold text-on-surface">{job.attempts}</p>
        </div>
        <div>
          <p className="text-on-surface-variant">Target</p>
          <p className="mt-1 font-semibold text-on-surface">
            {job.targetType ? `${job.targetType}: ${job.targetId}` : "-"}
          </p>
        </div>
        <div>
          <p className="text-on-surface-variant">Created</p>
          <p className="mt-1 font-semibold text-on-surface">
            {new Date(job.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <JsonBlock title="Payload" value={job.payload} />
        <JsonBlock title="Result" value={job.result} />
      </div>

      {job.error ? (
        <div className="mt-6 rounded-xl border border-error/30 bg-error-container/10 p-5 text-sm text-error">
          <p className="font-semibold">Error</p>
          <p className="mt-2 whitespace-pre-wrap">{job.error}</p>
        </div>
      ) : null}
    </DashboardShell>
  );
}
