"use client";

import { CheckSquare } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";

export default function TasksPage() {
  const { user } = useAuth();
  const role = user?.role || "customer";

  const emptyState = {
    freelancer: {
      title: "No active tasks assigned yet",
      description: "Tasks will appear here once you're matched to a project.",
    },
    customer: {
      title: "No tasks yet",
      description: "Tasks will appear after your brief and architecture spec are complete.",
    },
    admin: {
      title: "No tasks in the system",
      description: "Tasks will appear here once projects are active.",
    },
  };

  const content = emptyState[role as keyof typeof emptyState] || emptyState.customer;

  return (
    <DashboardShell
      role={role as "customer" | "freelancer" | "admin"}
      title="Tasks"
      subtitle="Track your assigned tasks and deliverables."
    >
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
          <CheckSquare size={32} className="text-outline" />
        </div>
        <h3 className="text-lg font-semibold text-on-surface">{content.title}</h3>
        <p className="mt-1 text-sm text-on-surface-variant">{content.description}</p>
      </div>
    </DashboardShell>
  );
}