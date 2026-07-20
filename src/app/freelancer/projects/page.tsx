"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getFreelancerAssignedProjects, type FreelancerAssignedProject } from "@/services/matching";
import { StatusBadge } from "@/components/ui/status-badge";

export default function FreelancerProjectsPage() {
  const [projects, setProjects] = useState<FreelancerAssignedProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFreelancerAssignedProjects({ phase: "planning", status: "assigned,accepted,in_progress" })
      .then((res) => setProjects(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="freelancer" title="My Projects" subtitle="Projects where you are actively assigned.">
      {loading ? (
        <p className="text-sm">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
          <Briefcase className="mx-auto mb-4 text-outline" size={48} />
          <h3 className="font-headline text-lg font-semibold text-on-surface">No active assignments</h3>
          <p className="mt-1 text-sm text-on-surface-variant">You have no pending or active project assignments matched to your profile.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((assignment) => (
            <div key={assignment.assignmentId} className="flex flex-col justify-between rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-on-surface">{assignment.projectTitle}</h3>
                  <StatusBadge status={assignment.status} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  {assignment.roleKey?.replace("_", " ")} Phase: {assignment.phase}
                </p>
                <p className="text-sm text-on-surface-variant line-clamp-2">
                  {assignment.roleBriefSummary ||
                    assignment.briefSummary ||
                    "Your role brief is being prepared."}
                </p>
                <div className="mt-3 flex gap-4 text-xs text-on-surface-variant">
                  <span>Budget: {assignment.budgetMin} - {assignment.budgetMax} {assignment.currency}</span>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end">
                <Link
                  href={`/freelancer/projects/${assignment.projectId}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
                >
                  Manage assignment <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
