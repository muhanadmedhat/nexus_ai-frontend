"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, FileText } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import { getProject } from "@/services/projects";
import { getProjectRoleAssignments, updateRoleAssignmentStatus } from "@/services/matching";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Project } from "@/types/project";

export default function FreelancerProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const toast = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Note: We realistically need an endpoint to get single assignment or filter assignments by token/me 
  // For Sprint 4, we use getProjectRoleAssignments and find our role
  
  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      getProject(projectId),
      getProjectRoleAssignments(projectId).catch(() => [])
    ])
      .then(([p, asns]) => {
        setProject(p);
        // Simplification for freelancer view: just assume the first one returning data or filter if we had profile id
        if (asns.length > 0) setAssignment(asns[0]); 
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleStatusChange = async (newStatus: "accepted" | "declined" | "in_progress") => {
    if (!assignment) return;
    try {
      await updateRoleAssignmentStatus(assignment.id, { status: newStatus });
      toast.success("Status updated", `Assignment moved to ${newStatus}`);
      setAssignment({ ...assignment, status: newStatus });
    } catch (e) {
      toast.error("Status update failed");
    }
  };

  return (
    <DashboardShell role="freelancer" title="Assignment Details" subtitle="Project brief and assignment management.">
      <Link href="/freelancer/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary">
        <ArrowLeft size={16} /> Back to my projects
      </Link>
      
      {loading ? (
        <p className="text-sm">Loading...</p>
      ) : !project ? (
        <p className="text-sm">Project not found.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <h2 className="font-headline text-2xl font-semibold mb-2 text-on-surface">{project.title}</h2>
              <p className="text-sm text-on-surface-variant">{project.description}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <h3 className="font-headline text-base font-semibold mb-3 text-on-surface">Your Assignment</h3>
              {assignment ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold capitalize">{assignment.roleKey?.replace("_", " ")}</span>
                    <StatusBadge status={assignment.status} />
                  </div>
                  
                  {assignment.status === "assigned" && (
                    <div className="flex gap-2">
                      <Button onClick={() => handleStatusChange("accepted")} className="flex-1">
                        <CheckCircle size={16} className="mr-1" /> Accept
                      </Button>
                      <Button onClick={() => handleStatusChange("declined")} variant="outline" className="flex-1 text-error hover:bg-error/10">
                        <XCircle size={16} className="mr-1" /> Decline
                      </Button>
                    </div>
                  )}

                  {assignment.status === "accepted" && (
                    <Button onClick={() => handleStatusChange("in_progress")} className="w-full">
                      Start Work
                    </Button>
                  )}

                  {(assignment.status === "in_progress" || assignment.status === "completed") && (
                    <Link href={`/freelancer/projects/${projectId}/planning`}>
                      <Button variant="outline" className="w-full mt-2">
                        <FileText size={16} className="mr-2" /> Planning Deliverables
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-sm text-on-surface-variant">No assignment data found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
