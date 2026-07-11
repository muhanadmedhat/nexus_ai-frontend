"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getCurrentAssessment, submitAssessment, type AssessmentResult } from "@/services/assessment";

export default function FreelancerAssessmentResultPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        // First, check if there's a submitted assessment
        const assessment = await getCurrentAssessment();
        if (!assessment) {
          // No assessment found – redirect to verification
          router.replace("/freelancer/verification");
          return;
        }

        if (assessment.status !== "submitted") {
          // If not submitted, go back to assessment page
          router.replace("/freelancer/assessment");
          return;
        }

        setResult({
          status: "pending_review",
          score: null,
          feedback: null,
          recommendation: null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load result");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [router]);

  if (loading) {
    return (
      <DashboardShell role="freelancer" title="Assessment Result" subtitle="Loading your result...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !result) {
    return (
      <DashboardShell role="freelancer" title="Assessment Result" subtitle="Error loading result">
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-error" />
          <p className="mt-2 text-error">{error || "Could not load result"}</p>
          <Button onClick={() => router.push("/freelancer/verification")} className="mt-4">
            Go to Verification
          </Button>
        </div>
      </DashboardShell>
    );
  }

  const getIcon = () => {
    if (result.status === "approved" || result.recommendation === "pass") {
      return <CheckCircle className="h-16 w-16 text-primary-container" />;
    }
    if (result.recommendation === "needs_review" || result.status === "needs_review") {
      return <AlertTriangle className="h-16 w-16 text-secondary" />;
    }
    if (result.recommendation === "fail" || result.status === "rejected") {
      return <XCircle className="h-16 w-16 text-error" />;
    }
    return <Loader2 className="h-16 w-16 animate-spin text-primary-container" />;
  };

  const getTitle = () => {
    if (result.status === "pending_review") return "Under Review";
    if (result.status === "approved" || result.recommendation === "pass") return "Approved! 🎉";
    if (result.recommendation === "needs_review") return "Needs Further Review";
    if (result.recommendation === "fail") return "Not Approved";
    return "Review in Progress";
  };

  const getDescription = () => {
    if (result.status === "pending_review") {
      return "Your assessment is being reviewed by our team. You'll receive an email once the review is complete.";
    }
    if (result.status === "approved" || result.recommendation === "pass") {
      return "Congratulations! Your assessment has been approved. You're now ready to start receiving project matches.";
    }
    if (result.recommendation === "needs_review") {
      return "Your assessment requires further review. Our team will contact you shortly with next steps.";
    }
    if (result.recommendation === "fail") {
      return "Unfortunately, your assessment did not meet the required standards. Please review the feedback and consider reapplying later.";
    }
    return "Your result is being processed.";
  };

  return (
    <DashboardShell
      role="freelancer"
      title="Assessment Result"
      subtitle="Here's the outcome of your assessment."
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-8 text-center card-shadow">
          <div className="mb-6 flex justify-center">
            {getIcon()}
          </div>

          <h2 className="text-2xl font-bold text-on-surface">{getTitle()}</h2>
          <p className="mt-2 text-on-surface-variant">{getDescription()}</p>

          {result.score !== null && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-container/10 px-4 py-1.5 text-sm font-medium text-primary-container">
              Score: {result.score}%
            </div>
          )}

          {result.feedback && (
            <div className="mt-6 rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 text-left">
              <h4 className="text-sm font-medium text-on-surface">Feedback</h4>
              <p className="text-sm text-on-surface-variant">{result.feedback}</p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {result.status === "pending_review" && (
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/freelancer")}
              >
                Go to Dashboard
              </Button>
            )}

            {(result.status === "approved" || result.recommendation === "pass") && (
              <Button onClick={() => router.push("/dashboard/freelancer")}>
                Go to Dashboard
              </Button>
            )}

            {result.recommendation === "needs_review" && (
              <Button variant="outline" onClick={() => router.push("/support")}>
                Contact Support
              </Button>
            )}

            {result.recommendation === "fail" && (
              <Button
                variant="outline"
                onClick={() => router.push("/freelancer/onboarding")}
              >
                Update Profile
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}