"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getRunDetail } from "@/services/matching";

export default function AdminMatchingDetail() {
  const { runId } = useParams<{ runId: string }>();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!runId) return;
    getRunDetail(runId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [runId]);

  return (
    <DashboardShell role="admin" title="Matching Review" subtitle="Review candidates against internal metrics.">
      <Link href="/dashboard/admin/matching" className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary">
        <ArrowLeft size={16} /> Back to queue
      </Link>
      
      {loading ? <p>Loading...</p> : !detail ? <p>Run not found.</p> : (
        <div className="space-y-6">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <h3 className="font-headline text-lg font-semibold mb-2 text-on-surface">Run Details</h3>
            <p className="text-sm">Status: <span className="font-semibold">{detail.status}</span></p>
            <p className="text-sm mt-1">Found <span className="font-semibold text-primary">{detail.candidates?.length || 0}</span> candidates.</p>
          </div>
          
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <h3 className="font-headline text-lg font-semibold mb-4 text-on-surface">Candidates Analytics</h3>
            <div className="grid gap-4">
              {detail.candidates?.map((c: any, i: number) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex justify-between items-center bg-surface-container-low p-2 rounded mb-2">
                    <span className="font-semibold">Rank #{c.rank} </span>
                    <span className="text-primary font-bold">Score: {c.score} / 100</span>
                  </div>
                  <p className="text-sm font-semibold">{c.freelancer?.name} - {c.freelancer?.headline}</p>
                  <p className="text-xs text-on-surface-variant mt-1 italic">&quot;{c.rationale}&quot;</p>
                  <div className="mt-3 text-xs bg-surface-container p-2 rounded">
                    <strong>Evidence: </strong> {JSON.stringify(c.evidence)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
