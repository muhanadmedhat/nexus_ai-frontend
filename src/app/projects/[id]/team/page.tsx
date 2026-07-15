"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import { getProject } from "@/services/projects";
import { getProjectTeam } from "@/services/matching";
import type { Project } from "@/types/project";
import { StatusBadge } from "@/components/ui/status-badge";

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const role = (user?.role || "customer") as "customer" | "freelancer" | "admin";
  const [project, setProject] = useState<Project | null>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getProject(id),
      getProjectTeam(id).catch(() => ({ planningTeam: [] }))
    ])
      .then(([p, t]) => {
        setProject(p);
        setTeam(t.planningTeam || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <DashboardShell role={role} title="Project Team" subtitle="View freelancers assigned to complete your project.">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to project
      </Link>
      
      {loading ? (
        <p className="text-sm">Loading...</p>
      ) : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
          <div className="mb-6 flex items-center gap-2 border-b border-outline-variant/20 pb-4">
            <Users className="text-primary" size={24} />
            <h3 className="font-headline text-lg font-semibold text-on-surface">Planning Team</h3>
          </div>
          
          {team.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Your team is currently being matched by our system.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {team.map((member: any, i: number) => (
                <div key={i} className="rounded-lg border border-outline-variant/30 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{member.roleKey.replace("_", " ")}</p>
                      <h4 className="mt-1 font-semibold text-on-surface">{member.freelancer?.name || "Pending..."}</h4>
                      <p className="mt-0.5 text-xs text-on-surface-variant line-clamp-1">{member.freelancer?.headline || "Freelancer matching in progress"}</p>
                    </div>
                    <StatusBadge status={member.status} />
                  </div>
                  {member.freelancer?.topSkills && member.freelancer.topSkills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {member.freelancer.topSkills.map((st: string) => (
                        <span key={st} className="rounded bg-surface-container px-2 py-0.5 text-[10px] uppercase text-on-surface-variant">
                          {st.replace(/[\[\]"]/g, '')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
