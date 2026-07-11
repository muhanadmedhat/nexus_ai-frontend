"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  User,
  Mail,
  ShieldCheck,
  Award,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getVerificationStatus, type VerificationStatus } from "@/services/verification";
import { startAssessment } from "@/services/assessment";

interface StatusItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  isComplete: boolean;
  statusText: string;
}

export default function FreelancerVerificationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingAssessment, setStartingAssessment] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await getVerificationStatus();
        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load verification status");
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, []);

  const handleStartAssessment = async () => {
    setStartingAssessment(true);
    setError(null);
    try {
      await startAssessment();
      router.push("/freelancer/assessment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start assessment");
    } finally {
      setStartingAssessment(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell role="freelancer" title="Verification" subtitle="Checking your profile status...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !status) {
    return (
      <DashboardShell role="freelancer" title="Verification" subtitle="Error loading status">
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-error" />
          <p className="mt-2 text-error">{error || "Could not load verification status"}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </div>
      </DashboardShell>
    );
  }

  // Define the checklist items based on status
  const checklistItems: StatusItem[] = [
    {
      key: "email",
      label: "Email verified",
      icon: <Mail size={18} />,
      isComplete: status.isEmailVerified,
      statusText: status.isEmailVerified ? "Verified" : "Pending",
    },
    {
      key: "profile",
      label: "Profile complete",
      icon: <User size={18} />,
      isComplete: status.isProfileComplete,
      statusText: status.isProfileComplete ? "Complete" : "Incomplete",
    },
    {
      key: "cv",
      label: "CV uploaded",
      icon: <FileText size={18} />,
      isComplete: status.hasCvUploaded,
      statusText: status.hasCvUploaded ? "Uploaded" : "Missing",
    },
    {
      key: "identity",
      label: "ID verified",
      icon: <ShieldCheck size={18} />,
      isComplete: status.isIdVerified,
      statusText: status.isIdVerified ? "Verified" : "Pending",
    },
    {
      key: "assessment",
      label: "Assessment",
      icon: <Award size={18} />,
      isComplete:
        status.status === "approved" ||
        status.status === "interview_pending" ||
        status.status === "assessment_submitted",
      statusText:
        status.status === "approved"
          ? "Approved"
          : status.status === "interview_pending"
          ? "Interview Pending"
          : status.status === "assessment_submitted"
          ? "Submitted"
          : status.status === "assessment_in_progress"
          ? "In Progress"
          : "Not Started",
    },
  ];

  const allComplete = checklistItems.every((item) => item.isComplete);
  const isBlocked = status.status === "rejected";

  return (
    <DashboardShell
      role="freelancer"
      title="Verification"
      subtitle="Complete your profile and start the assessment to get approved."
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 md:p-8 card-shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-on-surface">Verification Status</h2>
            {status.status === "approved" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container/20 px-3 py-1 text-xs font-medium text-primary-container">
                <CheckCircle size={14} />
                Approved
              </span>
            )}
            {status.status === "rejected" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-error/20 px-3 py-1 text-xs font-medium text-error">
                <XCircle size={14} />
                Rejected
              </span>
            )}
          </div>

          <div className="space-y-4">
            {checklistItems.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-lg border border-outline-variant/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-1.5 ${
                      item.isComplete
                        ? "bg-primary-container/20 text-primary-container"
                        : "bg-surface-container-high text-outline"
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span className="text-sm font-medium text-on-surface">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      item.isComplete ? "text-primary-container" : "text-on-surface-variant"
                    }`}
                  >
                    {item.statusText}
                  </span>
                  {item.isComplete ? (
                    <CheckCircle size={16} className="text-primary-container" />
                  ) : (
                    <AlertCircle size={16} className="text-outline" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {isBlocked && (
            <div className="mt-6 rounded-lg bg-error-container/10 border border-error/30 p-4">
              <p className="text-sm text-error">
                Your profile has been rejected. Reason: {status.rejectionReason || "No reason provided."}
              </p>
              <Button variant="outline" className="mt-3" onClick={() => router.push("/support")}>
                Contact Support
              </Button>
            </div>
          )}

          {allComplete && !isBlocked && status.status !== "approved" && (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleStartAssessment}
                loading={startingAssessment}
                disabled={startingAssessment || status.status === "assessment_in_progress"}
              >
                {status.status === "assessment_in_progress"
                  ? "Resume Assessment"
                  : "Start Assessment"}
              </Button>
            </div>
          )}

          {status.status === "assessment_submitted" && (
            <div className="mt-6 rounded-lg bg-primary-container/10 border border-primary-container/30 p-4 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-primary-container" />
              <p className="mt-1 font-medium text-on-surface">Assessment Submitted!</p>
              <p className="text-sm text-on-surface-variant">
                Your assessment is under review. You'll be notified when it's evaluated.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => router.push("/freelancer/assessment/result")}
              >
                View Result
              </Button>
            </div>
          )}

          {status.status === "approved" && (
            <div className="mt-6 rounded-lg bg-primary-container/10 border border-primary-container/30 p-4 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-primary-container" />
              <p className="mt-1 font-medium text-on-surface">You're approved!</p>
              <p className="text-sm text-on-surface-variant">
                Your profile is ready. You'll start receiving project matches.
              </p>
              <Button className="mt-3" onClick={() => router.push("/dashboard/freelancer")}>
                Go to Dashboard
              </Button>
            </div>
          )}

          {!allComplete && !isBlocked && (
            <div className="mt-4 text-sm text-on-surface-variant">
              <AlertCircle size={16} className="inline mr-1" />
              Complete all steps above to unlock the assessment.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}