"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getSubmissionDetail } from "@/services/planning";

export default function AdminSubmissionDetail() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!submissionId) return;
    getSubmissionDetail(submissionId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [submissionId]);

  return (
    <DashboardShell role="admin" title="Planning Submission Details" subtitle="Approve or request changes for a deliverable.">
      <Link href="/dashboard/admin/planning/submissions" className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary">
        <ArrowLeft size={16} /> Back to queue
      </Link>
      
      {loading ? <p>Loading...</p> : !detail ? <p>Submission not found.</p> : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
          <h3 className="font-headline text-lg font-semibold mb-2 text-on-surface">{detail.title}</h3>
          <p className="text-sm font-medium uppercase tracking-wider text-primary">{detail.submissionType?.replace("_", " ")}</p>
          <div className="mt-4 p-4 border rounded bg-surface-container-low text-sm">
            <h4 className="font-semibold mb-1">Summary</h4>
            <p className="text-on-surface-variant">{detail.summary}</p>
          </div>
          <div className="mt-4 p-4 border rounded text-xs bg-surface-container font-mono whitespace-pre-wrap">
            {JSON.stringify(detail.content, null, 2)}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
