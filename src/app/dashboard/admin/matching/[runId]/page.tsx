"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getRunDetail } from "@/services/matching";

const RISK_LABELS: Record<string, string> = {
  no_availability: "No availability",
  below_min_availability: "Below minimum availability",
  over_max_rate: "Over budget",
  missing_required_skills: "Missing required skills",
  low_assessment_score: "Low skill score",
};
const riskLabel = (flag: string) => RISK_LABELS[flag] ?? flag.replace(/_/g, " ");

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

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                    <span>Rate: <strong className="text-on-surface">{c.evidence?.hourlyRate != null ? c.evidence.hourlyRate : "—"}</strong></span>
                    <span>Availability: <strong className="text-on-surface">{c.evidence?.availabilityHours ?? 0}h/wk</strong></span>
                    <span>Experience: <strong className="text-on-surface">{c.evidence?.yearsExperience ?? 0} yrs</strong></span>
                  </div>

                  {c.evidence?.matchedSkills?.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-on-surface-variant">Matched:</span>
                      {c.evidence.matchedSkills.map((s: string) => (
                        <span key={s} className="rounded-full bg-surface-container-low text-primary text-xs font-medium px-2 py-0.5">{s}</span>
                      ))}
                    </div>
                  )}

                  {c.evidence?.missingSkills?.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-on-surface-variant">Missing:</span>
                      {c.evidence.missingSkills.map((s: string) => (
                        <span key={s} className="rounded-full bg-surface-container-low text-on-surface-variant text-xs px-2 py-0.5">{s}</span>
                      ))}
                    </div>
                  )}

                  {c.evidence?.riskFlags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {c.evidence.riskFlags.map((f: string) => (
                        <span key={f} className="rounded-full bg-surface-container-low text-error text-xs font-medium px-2 py-0.5">{riskLabel(f)}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
