"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createPlanningSubmission } from "@/services/planning";
import {
  getFreelancerProjectAssignment,
  type RoleAssignment,
} from "@/services/matching";

type SubmissionType = "architecture" | "ui_ux";

function submissionTypeForRole(roleKey: string): SubmissionType {
  return roleKey === "ui_ux" ? "ui_ux" : "architecture";
}

export default function FreelancerPlanningSubmission() {
  const { projectId } = useParams<{ projectId: string }>();
  const [assignment, setAssignment] = useState<RoleAssignment | null>(null);
  const [submissionType, setSubmissionType] = useState<SubmissionType>("architecture");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!projectId) return;
    getFreelancerProjectAssignment(projectId)
      .then((result) => {
        const assignments = result.assignments;
        const current = assignments.find((item) => ["accepted", "in_progress", "completed", "assigned"].includes(item.status)) ?? assignments[0] ?? null;
        setAssignment(current);
        if (current?.roleKey) {
          const nextType = submissionTypeForRole(current.roleKey);
          setSubmissionType(nextType);
          setTitle(nextType === "architecture" ? "System architecture proposal" : "UI/UX design proposal");
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Could not load your assignment";
        toast.error("Assignment unavailable", message);
      })
      .finally(() => setLoadingAssignment(false));
  }, [projectId, toast]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId || !assignment) {
      toast.error("No assignment found", "Accept the planning assignment before submitting a deliverable.");
      return;
    }

    setSubmitting(true);
    try {
      await createPlanningSubmission(projectId, {
        assignmentId: assignment.id,
        submissionType,
        title,
        summary,
        content: {
          summary,
          submittedByRole: assignment.roleKey,
          deliverableType: submissionType,
        },
        fileUrls: {},
        status: "submitted"
      });
      toast.success("Submission sent", "An admin can now review your deliverable.");
      router.push(`/freelancer/projects/${projectId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit deliverable";
      toast.error("Submission failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell role="freelancer" title="Planning Submission" subtitle="Submit your architecture or UI/UX deliverable.">
      <Link href={`/freelancer/projects/${projectId}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary">
        <ArrowLeft size={16} /> Back to assignment
      </Link>

      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow max-w-2xl">
        {loadingAssignment ? (
          <p className="text-sm text-on-surface-variant">Loading assignment...</p>
        ) : !assignment ? (
          <p className="text-sm text-on-surface-variant">No active planning assignment was found for this project.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Deliverable Type</label>
              <select value={submissionType} onChange={(event) => setSubmissionType(event.target.value as SubmissionType)} className="w-full rounded-md border border-outline-variant p-2.5 bg-surface">
                <option value="architecture">Architecture</option>
                <option value="ui_ux">UI/UX Design</option>
              </select>
              <p className="mt-1 text-xs text-on-surface-variant">Assignment: {assignment.roleKey.replace("_", " ")}</p>
            </div>
            {assignment.roleBrief?.summary ? (
              <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                  Role brief
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {assignment.roleBrief.summary}
                </p>
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Title</label>
              <input required value={title} onChange={(event) => setTitle(event.target.value)} type="text" className="w-full rounded-md border border-outline-variant p-2.5 bg-surface" placeholder="e.g. System Architecture v1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Summary</label>
              <textarea required value={summary} onChange={(event) => setSummary(event.target.value)} className="w-full rounded-md border border-outline-variant p-2.5 min-h-[120px] bg-surface" placeholder="Describe your architecture/design decisions, assumptions, and recommended next steps." />
            </div>
            <Button type="submit" loading={submitting} className="w-full mt-4"><Upload size={16} className="mr-2" /> Submit Deliverable</Button>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
