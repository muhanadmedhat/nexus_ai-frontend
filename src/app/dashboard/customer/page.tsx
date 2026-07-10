"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderOpen, FileText, Clock, CheckCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatsCard } from "@/components/ui/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { listProjects } from "@/services/projects";
import type { Project } from "@/types/project";
import { formatBudget, formatDate } from "@/utils/format";

export default function CustomerDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  const active = projects.filter((p) => p.status === "in_progress").length;
  const draft = projects.filter((p) => p.status === "draft").length;
  const inReview = projects.filter((p) => p.status === "in_review").length;
  const recent = projects.slice(0, 5);

  return (
    <DashboardShell
      role="customer"
      title="Customer Dashboard"
      subtitle="Track your active projects, AI agent progress, and escrow status."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Projects" value={projects.length} icon={<FolderOpen size={20} />} />
        <StatsCard label="Active" value={active} icon={<CheckCircle size={20} />} />
        <StatsCard label="Drafts" value={draft} icon={<FileText size={20} />} />
        <StatsCard label="Under Review" value={inReview} icon={<Clock size={20} />} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h3 className="font-headline text-lg font-semibold text-on-surface">Recent projects</h3>
        <Link href="/projects/new">
          <Button className="inline-flex w-auto px-5 py-2.5">
            <Plus size={18} className="mr-2" />
            New project
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-on-surface-variant">Loading…</p>
      ) : recent.length === 0 ? (
        <div className="mt-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
            <FolderOpen size={32} className="text-outline" />
          </div>
          <h3 className="text-lg font-semibold text-on-surface">No projects yet</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Create your first project and let Nexus AI handle the rest.
          </p>
          <Link href="/projects/new">
            <Button className="mt-4 inline-flex w-auto px-6">
              <Plus size={18} className="mr-2" />
              Create New Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
          {recent.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center justify-between gap-4 border-b border-outline-variant/20 px-5 py-4 last:border-0 hover:bg-surface-container-low"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-on-surface">{p.title}</p>
                <p className="text-xs text-on-surface-variant">
                  {formatBudget(p)} · Created {formatDate(p.createdAt)}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
