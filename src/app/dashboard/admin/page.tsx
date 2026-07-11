"use client";

import { useEffect, useState } from "react";
import { Users, FolderOpen, Cpu, AlertTriangle, Activity } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatsCard } from "@/components/ui/stats-card";
import { getAdminStats, type AdminStats } from "@/services/admin";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProjects: 0,
  });
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load stats"));
  }, []);

  return (
    <DashboardShell
      role="admin"
      title="Admin Dashboard"
      subtitle="Oversee users, projects, and platform activity."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Users" value={stats.totalUsers} icon={<Users size={20} />} />
        <StatsCard label="Total Projects" value={stats.totalProjects} icon={<FolderOpen size={20} />} />
        <StatsCard label="Running Agent Jobs" value={0} icon={<Cpu size={20} />} />
        <StatsCard label="Human Review Required" value={0} icon={<AlertTriangle size={20} />} />
      </div>
      {loadError && <p className="mt-4 text-sm text-error">{loadError}</p>}

      <div className="mt-8 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-headline text-lg font-semibold text-on-surface">Operational overview</h3>
          <Activity size={18} className="text-outline" />
        </div>
        <div className="grid gap-3 text-sm text-on-surface-variant md:grid-cols-3">
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="font-medium text-on-surface">Users and projects</p>
            <p className="mt-1 leading-6">Connected to the current admin stats endpoint.</p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="font-medium text-on-surface">Agent monitoring</p>
            <p className="mt-1 leading-6">Ready for Sprint 3 live job health and failures.</p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="font-medium text-on-surface">Human review</p>
            <p className="mt-1 leading-6">Ready for assessment and review queue routes.</p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
