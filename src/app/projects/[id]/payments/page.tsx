"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Wallet, ShieldCheck, Clock } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import { getProject } from "@/services/projects";
import { getProjectPayments } from "@/services/payments";
import type { Project } from "@/types/project";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/utils/format";

export default function PaymentsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const role = (user?.role || "customer") as "customer" | "freelancer" | "admin";
  const [project, setProject] = useState<Project | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getProject(id),
      getProjectPayments(id).catch(() => [])
    ])
      .then(([p, pmts]) => {
        setProject(p);
        setPayments(pmts);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <DashboardShell role={role} title="Project Payments" subtitle="Manage escrow deposits and release milestones.">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to project
      </Link>
      
      {loading ? (
        <p className="text-sm">Loading...</p>
      ) : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
          <div className="mb-6 flex items-center justify-between border-b border-outline-variant/20 pb-4">
            <div className="flex items-center gap-2">
              <Wallet className="text-primary" size={24} />
              <h3 className="font-headline text-lg font-semibold text-on-surface">Escrow Timeline</h3>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <ShieldCheck className="mb-4 text-outline" size={48} />
              <h4 className="font-semibold text-on-surface">No payments yet</h4>
              <p className="mt-1 text-sm text-on-surface-variant max-w-sm">Secure milestone funding will be available here when requested by your project manager.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-outline-variant/30 p-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-surface-container p-2">
                      <Clock className="text-on-surface-variant" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-on-surface uppercase tracking-wider text-xs text-primary">{payment.purpose.replace(/_/g, " ")}</h4>
                      <p className="mt-1 text-lg font-medium text-on-surface">{payment.amount} {payment.currency}</p>
                      {payment.paidAt && <p className="text-xs text-on-surface-variant mt-0.5">Paid on {formatDate(payment.paidAt)}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
