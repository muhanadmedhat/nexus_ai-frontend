"use client";

import { Settings } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";

export default function SettingsPage() {
  const { user } = useAuth();
  const role = user?.role || "customer";

  return (
    <DashboardShell
      role={role as "customer" | "freelancer" | "admin"}
      title="Settings"
      subtitle="Manage your account preferences."
    >
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
          <Settings size={32} className="text-outline" />
        </div>
        <h3 className="text-lg font-semibold text-on-surface">Settings</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Account settings will be available in the next sprint.
        </p>
      </div>
    </DashboardShell>
  );
}