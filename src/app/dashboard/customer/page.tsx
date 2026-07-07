"use client";

import Link from "next/link";
import { Plus, FolderOpen, Clock, DollarSign, CheckCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function CustomerDashboardPage() {
  const { user } = useAuth();

  // Mock data – replace with real API calls later
  const stats = {
    activeProjects: 0,
    underReview: 0,
    escrowHeld: "$0.00",
    escrowReleased: "$0.00",
  };

  return (
    <DashboardShell
      role="customer"
      title="Customer Dashboard"
      subtitle="Track your active projects, AI agent progress, and escrow status."
    >
      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Active Projects" value={stats.activeProjects} icon={<FolderOpen size={20} />} />
        <StatsCard label="Under Review" value={stats.underReview} icon={<Clock size={20} />} />
        <StatsCard label="Escrow Held" value={stats.escrowHeld} icon={<DollarSign size={20} />} />
        <StatsCard label="Escrow Released" value={stats.escrowReleased} icon={<CheckCircle size={20} />} />
      </div>

      {/* Empty state */}
      <div className="mt-8 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
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
    </DashboardShell>
  );
}