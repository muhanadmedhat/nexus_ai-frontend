"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import { getProjectTeam, type RoleAssignment } from "@/services/matching";
import { StatusBadge } from "@/components/ui/status-badge";

function skillBadges(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return { skill: item, score: null };
      if (!item || typeof item !== "object" || !("skill" in item)) return null;

      const skill = String((item as { skill?: unknown }).skill ?? "").trim();
      const rawScore = (item as { score?: unknown }).score;
      const score =
        rawScore == null || rawScore === "" ? null : Number(rawScore);

      return skill
        ? { skill, score: score != null && Number.isFinite(score) ? score : null }
        : null;
    })
    .filter((item): item is { skill: string; score: number | null } =>
      Boolean(item),
    );
}

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [team, setTeam] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || user?.role !== "customer") return;
    getProjectTeam(id)
      .then((result) => setTeam(result.planningTeam || []))
      .catch(() => setTeam([]))
      .finally(() => setLoading(false));
  }, [id, user?.role]);

  return (
    <DashboardShell role="customer" title="Project Team" subtitle="View freelancers assigned to complete your project.">
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
              {team.map((member) => (
                <div key={member.id} className="rounded-lg border border-outline-variant/30 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{member.roleKey.replace("_", " ")}</p>
                      <h4 className="mt-1 font-semibold text-on-surface">{member.freelancer?.name || "Pending..."}</h4>
                      <p className="mt-0.5 text-xs text-on-surface-variant line-clamp-1">{member.freelancer?.headline || "Freelancer matching in progress"}</p>
                    </div>
                    <StatusBadge status={member.status} />
                  </div>
                  {skillBadges(member.freelancer?.topSkills).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {skillBadges(member.freelancer?.topSkills).map((item) => (
                        <span key={item.skill} className="rounded bg-surface-container px-2 py-0.5 text-[10px] uppercase text-on-surface-variant">
                          {item.skill}
                          {item.score != null && Number.isFinite(item.score)
                            ? ` ${item.score.toFixed(1)}`
                            : ""}
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
