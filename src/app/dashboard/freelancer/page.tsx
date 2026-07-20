"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Check,
  Clock,
  DollarSign,
  Loader2,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getVerification } from "@/services/assessments";
import type { VerificationChecklist } from "@/types/assessment";
import {
  getFreelancerAssignedProjects,
  type FreelancerAssignedProject,
} from "@/services/matching";
import { StatusBadge } from "@/components/ui/status-badge";

export default function FreelancerDashboardPage() {
  const { user } = useAuth();
  const [verification, setVerification] = useState<VerificationChecklist | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [assignedProjects, setAssignedProjects] = useState<
    FreelancerAssignedProject[]
  >([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem("verificationBannerDismissed") === "1",
  );

  useEffect(() => {
    let active = true;

    getVerification()
      .then((v) => {
        if (active) setVerification(v);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setVerificationLoading(false);
      });

    getFreelancerAssignedProjects({
      phase: "planning",
      status: "assigned,accepted,in_progress",
      limit: 3,
    })
      .then((result) => {
        if (active) {
          setAssignedProjects(Array.isArray(result.data) ? result.data : []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setAssignmentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function dismissBanner() {
    setBannerDismissed(true);
    sessionStorage.setItem("verificationBannerDismissed", "1");
  }

  const isApproved =
    verification?.verificationStatus === "approved" ||
    verification?.nextAction === "approved";
  const isRejected =
    verification?.verificationStatus === "rejected" ||
    verification?.nextAction === "rejected";
  const showVerificationBanner =
    !bannerDismissed &&
    !verificationLoading &&
    verification !== null &&
    !isApproved &&
    !isRejected;
  const isWaitingForAdminReview =
    !isApproved &&
    !isRejected &&
    (verification?.verificationStatus === "assessment_submitted" ||
      verification?.verificationStatus === "interview_pending" ||
      verification?.nextAction === "wait_for_review" ||
      verification?.assessment?.status === "submitted" ||
      verification?.assessment?.status === "graded" ||
      verification?.assessment?.status === "needs_review");
  const profileReady = verification?.profileComplete === true || isApproved;

  const bannerCopy = isWaitingForAdminReview
    ? {
        title: "Waiting for admin review",
        body: "Your assessment is submitted. Our team is reviewing it and we’ll update your status here.",
        label: "View result",
        href: "/freelancer/assessment/result",
      }
    : {
        title: "Finish your verification",
        body: "Complete the remaining steps to get verified and start getting matched to work.",
        label: "Go to verification",
        href: "/freelancer/verification",
      };

  const readinessCopy = isApproved
    ? {
        title: "Ready for matching",
        body: "You are approved. New planning or project assignments will appear here as soon as an admin selects you.",
        progress: 100,
        progressLabel: "Approved",
      }
    : isRejected
      ? {
          title: "Verification needs another attempt",
          body: "Your latest review was not approved. Check the result and improve your profile before retrying when eligible.",
          progress: 100,
          progressLabel: "Rejected",
        }
      : isWaitingForAdminReview
    ? {
        title: "Waiting for admin review",
        body: "Your skill profile is ready. Matching will unlock once admin review is complete.",
        progress: 85,
        progressLabel: "Review pending",
      }
    : profileReady
      ? {
          title: "Profile ready",
          body: "Your assessment profile and skill ratings are ready for matching.",
          progress: 100,
          progressLabel: "Ready",
        }
      : {
          title: "Complete verification",
          body: "Upload your CV and complete the assessment to build your skill profile.",
          progress: 33,
          progressLabel: "In progress",
        };

  const stats = {
    activeTasks: assignedProjects.length,
    pendingSubmissions: assignedProjects.filter(
      (project) =>
        project.status === "assigned" || project.roleBriefStatus === "pending",
    ).length,
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
            <p className="font-medium text-on-surface">{bannerCopy.title}</p>
            <p className="text-sm text-on-surface-variant">{bannerCopy.body}</p>
            <Link
              href={bannerCopy.href}
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary-container hover:underline"
            >
              {bannerCopy.label}
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
            <h4 className="font-medium text-on-surface">{readinessCopy.title}</h4>
            <p className="text-sm text-on-surface-variant">{readinessCopy.body}</p>
            <div className="mt-3 h-1.5 w-full max-w-xs rounded-full bg-surface-container-high">
              <div
                className="h-1.5 rounded-full bg-primary-container"
                style={{ width: `${readinessCopy.progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">{readinessCopy.progressLabel}</p>
          </div>
        </div>
      </div>

      {/* Assigned work */}
      <div className="mt-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-headline text-lg font-semibold text-on-surface">
              Assigned project work
            </h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Planning roles and active assignments from the matching flow.
            </p>
          </div>
          <Link
            href="/freelancer/projects"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-container hover:underline"
          >
            View all <ArrowRight size={16} />
          </Link>
        </div>

        {assignmentsLoading ? (
          <div className="flex items-center justify-center py-10 text-on-surface-variant">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : assignedProjects.length > 0 ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {assignedProjects.map((assignment) => (
              <Link
                key={assignment.assignmentId}
                href={`/freelancer/projects/${assignment.projectId}`}
                className="group rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 transition hover:border-primary-container/40 hover:bg-primary-container/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-on-surface">
                      {assignment.projectTitle || "Assigned project"}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary-container">
                      {assignment.roleKey.replace(/_/g, " ")} · {assignment.phase}
                    </p>
                  </div>
                  <StatusBadge status={assignment.status} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-on-surface-variant">
                  {assignment.roleBriefSummary ||
                    assignment.briefSummary ||
                    "Your role brief is being prepared."}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-container group-hover:underline">
                  Open assignment <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
              <Briefcase size={32} className="text-outline" />
            </div>
            <h3 className="text-lg font-semibold text-on-surface">No assigned project work yet</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              {isApproved
                ? "You are approved. Matching results will appear here once an admin assigns you to a project."
                : isWaitingForAdminReview
                  ? "Matching starts after admin review is complete."
                  : "Complete verification to get matched with relevant projects."}
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
