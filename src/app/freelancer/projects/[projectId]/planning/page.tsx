"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createPlanningSubmission } from "@/services/planning";

export default function FreelancerPlanningSubmission() {
  const { projectId } = useParams<{ projectId: string }>();
  const [submissionType, setSubmissionType] = useState<"architecture" | "ui_ux">("architecture");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Provide dummy required fields, robust system would extract assignmentId dynamically via context
      const mockAssignmentId = "assignment-id"; 
      await createPlanningSubmission(projectId as string, {
        assignmentId: mockAssignmentId,
        submissionType,
        title,
        summary,
        content: { overview: "Drafted plan..." },
        fileUrls: {},
        status: "submitted"
      });
      toast.success("Submission sent!");
      router.push(`/freelancer/projects/${projectId}`);
    } catch (err) {
      toast.error("Failed to submit. Ensure your assignment ID is mapped.");
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Deliverable Type</label>
            <select value={submissionType} onChange={(e) => setSubmissionType(e.target.value as any)} className="w-full rounded-md border border-outline-variant p-2.5 bg-surface">
              <option value="architecture">Architecture</option>
              <option value="ui_ux">UI/UX Design</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Title</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} type="text" className="w-full rounded-md border border-outline-variant p-2.5 bg-surface" placeholder="e.g. System Architecture v1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Summary</label>
            <textarea required value={summary} onChange={(e) => setSummary(e.target.value)} className="w-full rounded-md border border-outline-variant p-2.5 min-h-[100px] bg-surface" placeholder="Brief context..."></textarea>
          </div>
          <Button type="submit" loading={submitting} className="w-full mt-4"><Upload size={16} className="mr-2" /> Submit Deliverable</Button>
        </form>
      </div>
    </DashboardShell>
  );
}
