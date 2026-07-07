"use client";

import { Users, FolderOpen, Cpu, AlertTriangle, Activity } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatsCard } from "@/components/ui/stats-card";
import { useAuth } from "@/hooks/use-auth";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const stats = {
    totalUsers: 0,
    activeProjects: 0,
    runningAgentJobs: 0,
    humanReviewRequired: 0,
  };

  const recentActivity = [
    { time: "Just now", action: "New user registered", user: "john@example.com" },
    { time: "5 min ago", action: "Project created", user: "sarah@example.com" },
    { time: "12 min ago", action: "Agent job completed", user: "System" },
    { time: "1 hour ago", action: "Payment released", user: "ahmed@example.com" },
  ];

  return (
    <DashboardShell
      role="admin"
      title="Admin Dashboard"
      subtitle="Oversee users, projects, and platform activity."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Users" value={stats.totalUsers} icon={<Users size={20} />} />
        <StatsCard label="Active Projects" value={stats.activeProjects} icon={<FolderOpen size={20} />} />
        <StatsCard label="Running Agent Jobs" value={stats.runningAgentJobs} icon={<Cpu size={20} />} />
        <StatsCard label="Human Review Required" value={stats.humanReviewRequired} icon={<AlertTriangle size={20} />} />
      </div>

      <div className="mt-8 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-headline text-lg font-semibold text-on-surface">Recent Activity</h3>
          <Activity size={18} className="text-outline" />
        </div>
        <div className="space-y-3">
          {recentActivity.map((item, index) => (
            <div key={index} className="flex items-center justify-between border-b border-outline-variant/20 pb-3 last:border-0 last:pb-0">
              <div>
                <p className="text-sm text-on-surface">{item.action}</p>
                <p className="text-xs text-on-surface-variant">{item.user}</p>
              </div>
              <span className="text-xs text-on-surface-variant/60">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}