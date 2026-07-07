"use client";

import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function ProjectsPage() {
  const { user } = useAuth();
  const role = user?.role || "customer";

  const emptyState = {
    customer: {
      title: "No projects yet",
      description: "Create your first project and let Nexus AI handle the rest.",
      cta: "Create your first project",
    },
    freelancer: {
      title: "No assigned project work yet",
      description: "Complete your profile to get matched with relevant projects.",
      cta: "Complete your profile",
    },
    admin: {
      title: "No projects in the system",
      description: "Projects will appear here once customers create them.",
      cta: "View all users",
    },
  };

  const content = emptyState[role as keyof typeof emptyState] || emptyState.customer;

  return (
    <DashboardShell
      role={role as "customer" | "freelancer" | "admin"}
      title="Projects"
      subtitle="View and manage all your projects."
    >
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
          <FolderOpen size={32} className="text-outline" />
        </div>
        <h3 className="text-lg font-semibold text-on-surface">{content.title}</h3>
        <p className="mt-1 text-sm text-on-surface-variant">{content.description}</p>
        <Link href={role === "customer" ? "/projects/new" : role === "freelancer" ? "/profile" : "/admin/users"}>
          <Button className="mt-4 inline-flex w-auto px-6">
            {role === "customer" && <Plus size={18} className="mr-2" />}
            {content.cta}
          </Button>
        </Link>
      </div>
    </DashboardShell>
  );
}