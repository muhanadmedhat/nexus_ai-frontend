"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Clock, Star, DollarSign, AlertCircle, UserRound, ShieldCheck, X, Check } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getVerification } from "@/services/assessments";
import type { VerificationChecklist } from "@/types/assessment";

export default function FreelancerDashboardPage() {
  const { user } = useAuth();
  const [verification, setVerification] = useState<VerificationChecklist | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const dismissed =
      typeof window !== "undefined" &&
      sessionStorage.getItem("verificationBannerDismissed") === "1";
    getVerification()
      .then((v) => {
        setVerification(v);
        if (dismissed) setBannerDismissed(true);
      })
      .catch(() => {});
  }, []);

  function dismissBanner() {
    setBannerDismissed(true);
    sessionStorage.setItem("verificationBannerDismissed", "1");
  }

  const showVerificationBanner =
    !bannerDismissed &&
    verification !== null &&
    verification.verificationStatus !== "approved";

  const stats = {
    activeTasks: 0,
    pendingSubmissions: 0,
    avgScore: "—",
    estimatedEarnings: "$0.00",
  };

  return (
    <DashboardShell
      role="freelancer"
      title="Freelancer Dashboard"
      subtitle="Manage your profile, matched tasks, and submissions."
    >
      {showVerificationBanner ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-secondary-container/40 bg-secondary-container/20 p-4 card-shadow">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-secondary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-on-surface">Finish your verification</p>
            <p className="text-sm text-on-surface-variant">
              Complete the remaining steps to get verified and start getting matched to work.
            </p>
            <Link
              href="/freelancer/verification"
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary-container hover:underline"
            >
              Go to verification
              <Check size={16} />
            </Link>
          </div>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <X size={18} />
          </button>
        </div>
      ) : null}

      <section className="mb-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="font-headline text-2xl font-bold text-on-surface sm:text-3xl">
              Welcome back, {user?.firstName || "there"}.
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Keep your profile ready so the matching flow can recommend the right project work.
            </p>
          </div>
          <Link href="/profile" className="shrink-0">
            <Button variant="outline" className="w-full px-5 py-2.5 sm:w-auto">
              <UserRound size={18} />
              Update profile
            </Button>
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Active Tasks" value={stats.activeTasks} icon={<Briefcase size={20} />} />
        <StatsCard label="Pending Submissions" value={stats.pendingSubmissions} icon={<Clock size={20} />} />
        <StatsCard label="Avg Evaluation Score" value={stats.avgScore} icon={<Star size={20} />} />
        <StatsCard label="Estimated Earnings" value={stats.estimatedEarnings} icon={<DollarSign size={20} />} />
      </div>

      {/* Profile readiness */}
      <div className="mt-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-secondary-container/20 p-2.5">
            <AlertCircle size={20} className="text-secondary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-on-surface">Complete your profile</h4>
            <p className="text-sm text-on-surface-variant">
              Add your skills, portfolio, and availability to start getting matched.
            </p>
            <div className="mt-3 h-1.5 w-full max-w-xs rounded-full bg-surface-container-high">
              <div className="h-1.5 w-1/3 rounded-full bg-primary-container" />
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">33% complete</p>
          </div>
        </div>
      </div>

      {/* Empty tasks section */}
      <div className="mt-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
          <Briefcase size={32} className="text-outline" />
        </div>
        <h3 className="text-lg font-semibold text-on-surface">No assigned project work yet</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Complete your profile to get matched with relevant projects.
        </p>
      </div>
    </DashboardShell>
  );
}
