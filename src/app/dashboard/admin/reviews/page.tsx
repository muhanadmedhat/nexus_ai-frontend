"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Star, Users } from "lucide-react";

export default function AdminReviewsPage() {
  return (
    <DashboardShell
      role="admin"
      title="Reviews"
      subtitle="Review records will appear here once task-level reviews are stored."
    >
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 card-shadow">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container/10 text-primary-container">
              <Star size={24} />
            </div>
            <h2 className="mt-5 font-headline text-2xl font-semibold text-on-surface">
              Reviews are not stored as standalone records yet
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              The database currently stores freelancer aggregate rating fields,
              but it does not have a review table with reviewer, project, rating,
              and comment rows. This page is ready for that data model without
              showing fake review history.
            </p>
          </div>
          <Link href="/dashboard/admin/freelancers">
            <Button className="!w-auto px-4 py-2">
              <Users size={16} />
              View freelancers
            </Button>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
