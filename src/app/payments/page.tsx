"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import {
  createEscrowCheckoutSession,
  getCustomerPaymentProjects,
  type ProjectPaymentSummary,
} from "@/services/payments";
import { formatDate, formatMoney } from "@/utils/format";

export default function PaymentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState<ProjectPaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingProjectId, setPayingProjectId] = useState<string | null>(null);

  const totals = useMemo(
    () =>
      projects.reduce(
        (sum, item) => ({
          quoted: sum.quoted + (item.quote.amount ?? 0),
          paid: sum.paid + item.totals.paidAmount,
          remaining: sum.remaining + (item.totals.remainingAmount ?? 0),
        }),
        { quoted: 0, paid: 0, remaining: 0 },
      ),
    [projects],
  );

  useEffect(() => {
    if (user?.role !== "customer") return;

    getCustomerPaymentProjects()
      .then(setProjects)
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Could not load payments";
        toast.error("Payments unavailable", message);
        setProjects([]);
      })
      .finally(() => setLoading(false));
  }, [toast, user?.role]);

  const handlePay = async (project: ProjectPaymentSummary) => {
    const amount = project.actions.suggestedPaymentAmount;
    const currency = project.quote.currency ?? project.project.currency;
    if (!amount || amount <= 0 || !project.actions.canPay) return;

    setPayingProjectId(project.project.id);
    try {
      const checkout = await createEscrowCheckoutSession(project.project.id, {
        amount,
        currency,
        purpose:
          project.actions.suggestedPaymentPurpose ?? "full_project_deposit",
      });

      if (!checkout.checkoutUrl) {
        throw new Error("Stripe did not return a checkout link");
      }

      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      toast.error(
        "Checkout failed",
        error instanceof Error ? error.message : "Please try again.",
      );
      setPayingProjectId(null);
    }
  };

  return (
    <DashboardShell
      role="customer"
      title="Payments"
      subtitle="Review final project prices and fund escrow after requirements are confirmed."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={<ReceiptText size={20} />}
          label="Quoted work"
          value={formatMoney(
            totals.quoted,
            projects[0]?.project.currency ?? "EGP",
          )}
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="Escrow funded"
          value={formatMoney(
            totals.paid,
            projects[0]?.project.currency ?? "EGP",
          )}
        />
        <StatCard
          icon={<Wallet size={20} />}
          label="Remaining"
          value={formatMoney(
            totals.remaining,
            projects[0]?.project.currency ?? "EGP",
          )}
        />
      </div>

      <div className="mt-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
        <div className="flex flex-col gap-2 border-b border-outline-variant/20 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-headline text-lg font-semibold text-on-surface">
              Project escrow
            </h3>
            <p className="text-sm text-on-surface-variant">
              Final prices appear after each project requirements brief is
              confirmed.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Loading payments...
          </p>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
              <CreditCard size={28} className="text-outline" />
            </div>
            <h4 className="font-semibold text-on-surface">
              No project payments yet
            </h4>
            <p className="mt-1 text-sm text-on-surface-variant">
              Create a project and confirm its requirements brief to receive a
              final price.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/20">
            {projects.map((project) => (
              <div
                key={project.project.id}
                className="grid gap-4 p-5 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-headline text-base font-semibold text-on-surface">
                      {project.project.title}
                    </h4>
                    <StatusBadge status={project.quote.status} />
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Project budget:{" "}
                    {formatMoney(
                      project.project.budgetMin,
                      project.project.currency,
                    )}{" "}
                    -{" "}
                    {formatMoney(
                      project.project.budgetMax,
                      project.project.currency,
                    )}
                  </p>
                  {project.project.deadline && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <Clock size={14} /> Deadline{" "}
                      {formatDate(project.project.deadline)}
                    </p>
                  )}
                  {project.actions.payBlockedReason && (
                    <p className="mt-2 flex max-w-2xl items-start gap-1.5 text-xs text-on-surface-variant">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      {project.actions.payBlockedReason}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-lg bg-surface-container-low p-3 text-sm">
                  <Amount
                    label="Final price"
                    value={formatMoney(
                      project.quote.amount,
                      project.quote.currency,
                    )}
                  />
                  <Amount
                    label="Paid"
                    value={formatMoney(
                      project.totals.paidAmount,
                      project.totals.currency,
                    )}
                  />
                  <Amount
                    label="Remaining"
                    value={formatMoney(
                      project.totals.remainingAmount,
                      project.totals.currency,
                    )}
                  />
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link href={`/projects/${project.project.id}/payments`}>
                    <Button type="button" variant="outline" size="sm">
                      Details
                      <ArrowUpRight size={15} />
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!project.actions.canPay}
                    loading={payingProjectId === project.project.id}
                    onClick={() => handlePay(project)}
                  >
                    <CreditCard size={15} />
                    {project.actions.payButtonLabel ?? "Pay"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
        {icon}
      </div>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 font-headline text-2xl font-semibold text-on-surface">
        {value}
      </p>
    </div>
  );
}

function Amount({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="mt-1 font-semibold text-on-surface">{value}</p>
    </div>
  );
}
