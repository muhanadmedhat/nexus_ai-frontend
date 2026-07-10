"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { listProjects } from "@/services/projects";
import type { Project } from "@/types/project";
import { formatBudget, formatDate } from "@/utils/format";

export default function ProjectsPage() {
  const { user } = useAuth();
  const role = (user?.role || "customer") as "customer" | "freelancer" | "admin";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

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

      {loading ? null : projects.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow transition-all hover:border-primary-container/50"
            >
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
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
