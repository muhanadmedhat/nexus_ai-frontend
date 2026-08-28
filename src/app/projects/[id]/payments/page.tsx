"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import {
  createEscrowCheckoutSession,
  getProjectPaymentSummary,
  syncEscrowCheckoutSession,
  type ProjectPaymentSummary,
} from "@/services/payments";
import { formatBudget, formatDate, formatMoney } from "@/utils/format";
import { updateProject } from "@/services/projects";
import { confirmBrief } from "@/services/brief";

export default function ProjectPaymentsPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const paymentState = searchParams.get("payment");
  const checkoutSessionId = searchParams.get("session_id");
  const [summary, setSummary] = useState<ProjectPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [updatingBudget, setUpdatingBudget] = useState(false);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const loadSummary = useCallback(
    (syncSessionId?: string | null, showLoading = true) => {
      if (!id || user?.role !== "customer") return;
      if (showLoading) setLoading(true);
      const request = syncSessionId
        ? syncEscrowCheckoutSession(id, syncSessionId)
        : getProjectPaymentSummary(id);

      request
        .then((nextSummary) => {
          setSummary(nextSummary);
          setBudgetMin(String(nextSummary.project.budgetMin ?? ""));
          setBudgetMax(String(nextSummary.project.budgetMax ?? ""));
          if (syncSessionId) {
            toast.success(
              "Escrow funded",
              "Stripe confirmed the payment and the project balance is updated.",
            );
          }
        })
        .catch((error) => {
          if (!showLoading) return;
          const message =
            error instanceof Error
              ? error.message
              : "Could not load project payments";
          toast.error("Payments unavailable", message);
          setSummary(null);
        })
        .finally(() => setLoading(false));
    },
    [id, toast, user?.role],
  );

  const handleBudgetUpdate = async () => {
    if (!id || !summary) return;
    const nextMin = Number(budgetMin);
    const nextMax = Number(budgetMax);
    if (
      !Number.isFinite(nextMin) ||
      !Number.isFinite(nextMax) ||
      nextMin < 0 ||
      nextMax <= 0 ||
      nextMin > nextMax
    ) {
      toast.error(
        "Invalid budget",
        "Enter a positive maximum that is at least the minimum.",
      );
      return;
    }
    setUpdatingBudget(true);
    try {
      await updateProject(id, { budgetMin: nextMin, budgetMax: nextMax });
      await confirmBrief(id);
      toast.success(
        "Budget recalculated",
        "The quote and compensation split now use the updated range.",
      );
      loadSummary();
    } catch (error) {
      toast.error(
        "Could not update budget",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setUpdatingBudget(false);
    }
  };

  useEffect(() => {
    const shouldSyncCheckout =
      paymentState === "success" && Boolean(checkoutSessionId);

    void Promise.resolve().then(() =>
      loadSummary(shouldSyncCheckout ? checkoutSessionId : null),
    );

    if (paymentState === "cancelled") {
      toast.error("Payment cancelled", "No escrow was funded.");
    }
  }, [checkoutSessionId, loadSummary, paymentState, toast]);

  useEffect(() => {
    if (!id || user?.role !== "customer") return;
    const refresh = () => loadSummary(null, false);
    const onNotification = (event: Event) => {
      const notification = (
        event as CustomEvent<{ projectId?: string; type?: string }>
      ).detail;
      if (notification?.projectId !== id) return;
      if (
        ![
          "implementation_capacity_update",
          "implementation_funding_ready",
        ].includes(notification.type ?? "")
      )
        return;
      refresh();
      if (notification.type !== "implementation_funding_ready") return;
      toast.info(
        "Implementation payment unlocked",
        "Every task has an accepted freelancer. You can fund implementation now.",
      );
    };
    const interval = window.setInterval(refresh, 15_000);
    window.addEventListener("nexus:notification", onNotification);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("nexus:notification", onNotification);
    };
  }, [id, loadSummary, toast, user?.role]);

  const handlePay = async () => {
    if (
      !summary?.actions.canPay ||
      !summary.actions.suggestedPaymentAmount ||
      !summary.actions.suggestedPaymentPurpose
    )
      return;
    setPaying(true);
    try {
      const checkout = await createEscrowCheckoutSession(summary.project.id, {
        amount: summary.actions.suggestedPaymentAmount,
        currency: summary.quote.currency ?? summary.project.currency,
        purpose: summary.actions.suggestedPaymentPurpose,
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
      setPaying(false);
    }
  };

  return (
    <DashboardShell
      role="customer"
      title="Project payments"
      subtitle="Fund planning first, then implementation only after every exact task is staffed."
    >
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to project
      </Link>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading payments...</p>
      ) : !summary ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
          <h3 className="text-lg font-semibold text-on-surface">
            Could not load payments
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Refresh and try again.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-headline text-2xl font-semibold text-on-surface">
                    {summary.project.title}
                  </h2>
                  <StatusBadge status={summary.quote.status} />
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Customer range: {formatBudget(summary.project)}
                </p>
                {summary.quote.notes && (
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-on-surface-variant">
                    {summary.quote.notes}
                  </p>
                )}
              </div>

              <div className="min-w-[260px] rounded-lg bg-surface-container-low p-4">
                <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                  Final price
                </p>
                <p className="mt-1 font-headline text-3xl font-semibold text-on-surface">
                  {formatMoney(summary.quote.amount, summary.quote.currency)}
                </p>
                {summary.quote.isOutOfBudget && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-error">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    This estimate is above the customer range.
                  </p>
                )}
                <Button
                  type="button"
                  className="mt-4"
                  disabled={!summary.actions.canPay}
                  loading={paying}
                  onClick={handlePay}
                >
                  <CreditCard size={18} />
                  {summary.actions.payButtonLabel ?? "Fund project escrow"}
                </Button>
                {summary.actions.payBlockedReason && (
                  <p className="mt-2 text-xs text-on-surface-variant">
                    {summary.actions.payBlockedReason}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
            <h3 className="font-headline text-lg font-semibold text-on-surface">
              Two-stage protection
            </h3>
            <p className="mt-1 max-w-4xl text-sm leading-relaxed text-on-surface-variant">
              The planning package pays for reviewed architecture, UI/UX, and
              the executable Scrum plan. You keep those deliverables even if
              exact implementation staffing later fails. Nexus does not charge
              the implementation balance until every materialized task has an
              accepted freelancer; task deadlines and repository access start
              only after that second payment.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <FundingStage
                label="1. Planning package"
                amount={summary.funding.planningAmount}
                currency={summary.quote.currency ?? summary.project.currency}
                state={
                  summary.funding.planningFundedAt
                    ? "Funded"
                    : summary.funding.stage === "planning"
                      ? "Ready to fund"
                      : "Team confirmation in progress"
                }
              />
              <FundingStage
                label="2. Implementation balance"
                amount={summary.funding.implementationAmount}
                currency={summary.quote.currency ?? summary.project.currency}
                state={
                  summary.funding.implementationFundedAt
                    ? "Funded"
                    : summary.funding.stage === "implementation"
                      ? "Exact team accepted — ready to fund"
                      : "Locked until exact task staffing"
                }
              />
            </div>
            {summary.funding.capacitySnapshot && (
              <div className="mt-4 rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-on-surface">
                    Implementation capacity sweep
                  </span>
                  <StatusBadge
                    status={
                      summary.funding.capacitySnapshot.status ?? "unknown"
                    }
                  />
                </div>
                <p className="mt-1">
                  {summary.funding.capacitySnapshot.workableCandidates ?? 0}
                  {" workable candidates for an estimated "}
                  {summary.funding.capacitySnapshot.requiredPeople ?? 0}-person
                  implementation team. This sweep gates planning payment but
                  does not assign freelancers before the exact tasks exist.
                </p>
                {summary.funding.capacitySnapshot.status === "unavailable" && (
                  <p className="mt-2 text-sm font-medium text-on-surface">
                    Planning payment is temporarily locked. Nexus AI keeps
                    sweeping the freelancer pool and will unlock this button and
                    email you a payment link as soon as enough implementation
                    freelancers are available.
                  </p>
                )}
                {summary.funding.capacitySnapshot.blockingReasons?.map(
                  (reason) => (
                    <p key={reason} className="mt-2 text-xs">
                      {reason}
                    </p>
                  ),
                )}
              </div>
            )}
          </section>

          {summary.budgetAllocation && (
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
              <h3 className="font-headline text-lg font-semibold text-on-surface">
                How the project price is allocated
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Planning compensation is reserved first. Implementation stays
                locked until the approved Scrum plan defines exact tasks and
                each one has an accepted freelancer.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  ...(summary.budgetAllocation.platformFee
                    ? [
                        {
                          label: "Nexus platform fee",
                          allocation: summary.budgetAllocation.platformFee,
                        },
                      ]
                    : []),
                  ...(summary.budgetAllocation.governance
                    ? [
                        {
                          label: "Principal reviewer",
                          allocation:
                            summary.budgetAllocation.governance
                              .principalReviewer,
                        },
                      ]
                    : []),
                  {
                    label: "UI/UX planning",
                    allocation: summary.budgetAllocation.planning.ui_ux,
                  },
                  {
                    label: "Architecture planning",
                    allocation: summary.budgetAllocation.planning.architect,
                  },
                  {
                    label: "Implementation tasks",
                    allocation: summary.budgetAllocation.implementation,
                  },
                ].map(({ label, allocation }) => (
                  <div
                    key={label}
                    className="rounded-lg bg-surface-container-low p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                      {label} · {allocation.percentage}%
                    </p>
                    <p className="mt-1 text-xl font-semibold text-on-surface">
                      {formatMoney(
                        Number(allocation.amount),
                        summary.budgetAllocation?.currency,
                      )}
                    </p>
                    {"maxHourlyRate" in allocation &&
                      "estimatedHours" in allocation && (
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Internal capacity estimate:{" "}
                          {Number(allocation.estimatedHours)} hours
                          {"people" in allocation && allocation.people
                            ? ` across ${Number(allocation.people)} ${Number(allocation.people) === 1 ? "person" : "people"}`
                            : ""}
                          . Actual freelancer compensation uses the accepted
                          contract and cannot exceed this allocation.
                        </p>
                      )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {summary.quoteEvidence && (
            <details className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
              <summary className="font-headline text-lg font-semibold text-on-surface">
                Pricing evidence and assumptions
              </summary>
              <p className="mt-2 text-sm text-on-surface-variant">
                Immutable quote snapshot ·{" "}
                {summary.quoteEvidence.estimatorVersion} ·{" "}
                {Math.round(summary.quoteEvidence.confidence * 100)}% confidence
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {summary.quoteEvidence.roleEstimates.map((role) => (
                  <div
                    key={role.roleKey}
                    className="rounded-lg bg-surface-container-low p-3 text-sm text-on-surface"
                  >
                    <span className="font-semibold">
                      {role.roleKey.replaceAll("_", " ")}
                    </span>
                    <span className="block text-on-surface-variant">
                      Fixed package share:{" "}
                      {formatMoney(
                        role.subtotal,
                        summary.quoteEvidence?.currency,
                      )}
                    </span>
                    <span className="block text-xs text-on-surface-variant">
                      Internal capacity estimate: {role.people}{" "}
                      {role.people === 1 ? "person" : "people"},{" "}
                      {role.hoursEach}h each
                    </span>
                  </div>
                ))}
              </div>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
                {summary.quoteEvidence.pricingSignals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {summary.quoteEvidence.sources.map((source) =>
                  source.domain ? (
                    <a
                      key={source.reference}
                      href={source.reference}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-primary-container hover:underline"
                    >
                      {source.domain}
                    </a>
                  ) : (
                    <span
                      key={source.reference}
                      className="text-on-surface-variant"
                    >
                      {source.reference}
                    </span>
                  ),
                )}
              </div>
            </details>
          )}

          {summary.totals.paidAmount <= 0 &&
            summary.totals.pendingAmount <= 0 && (
              <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
                <h3 className="font-headline text-lg font-semibold text-on-surface">
                  Need to increase the budget?
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Update the customer range before paying. Nexus will
                  recalculate the quote, role shares, task pool, and affordable
                  rate ceilings.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Input
                    label={`Minimum (${summary.project.currency})`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetMin}
                    onChange={(event) => setBudgetMin(event.target.value)}
                  />
                  <Input
                    label={`Maximum (${summary.project.currency})`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={budgetMax}
                    onChange={(event) => setBudgetMax(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    loading={updatingBudget}
                    onClick={handleBudgetUpdate}
                  >
                    Recalculate
                  </Button>
                </div>
              </section>
            )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Metric
              icon={<ReceiptText size={20} />}
              label="Final estimate"
              value={formatMoney(summary.quote.amount, summary.quote.currency)}
            />
            <Metric
              icon={<CheckCircle2 size={20} />}
              label="Escrow funded"
              value={formatMoney(
                summary.totals.paidAmount,
                summary.totals.currency,
              )}
            />
            <Metric
              icon={<Wallet size={20} />}
              label="Remaining"
              value={formatMoney(
                summary.totals.remainingAmount,
                summary.totals.currency,
              )}
            />
            <Metric
              icon={<RefreshCw size={20} />}
              label="Pending checkout"
              value={formatMoney(
                summary.totals.pendingAmount,
                summary.totals.currency,
              )}
            />
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
            <div className="border-b border-outline-variant/20 p-5">
              <h3 className="font-headline text-lg font-semibold text-on-surface">
                Milestone funding
              </h3>
              <p className="text-sm text-on-surface-variant">
                These amounts come from the approved Scrum Master plan.
              </p>
            </div>
            {summary.milestones.length === 0 ? (
              <p className="p-6 text-sm text-on-surface-variant">
                No priced milestones yet. They appear after the approved plan is
                materialized.
              </p>
            ) : (
              <div className="divide-y divide-outline-variant/20">
                {summary.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="grid gap-3 p-5 md:grid-cols-[1fr_auto_auto] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-on-surface">
                          {milestone.title}
                        </h4>
                        <StatusBadge status={milestone.status} />
                      </div>
                      {milestone.dueAt && (
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Due {formatDate(milestone.dueAt)}
                        </p>
                      )}
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-on-surface-variant">Budget</p>
                      <p className="font-semibold text-on-surface">
                        {formatMoney(
                          milestone.budgetAmount,
                          milestone.currency,
                        )}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-on-surface-variant">
                        Remaining
                      </p>
                      <p className="font-semibold text-on-surface">
                        {formatMoney(
                          milestone.remainingAmount,
                          milestone.currency,
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
            <div className="border-b border-outline-variant/20 p-5">
              <h3 className="font-headline text-lg font-semibold text-on-surface">
                Payment history
              </h3>
            </div>
            {summary.payments.length === 0 ? (
              <p className="p-6 text-sm text-on-surface-variant">
                No payments have been created yet.
              </p>
            ) : (
              <div className="divide-y divide-outline-variant/20">
                {summary.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="grid gap-3 p-5 md:grid-cols-[1fr_auto_auto] md:items-center"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {payment.purpose.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Created{" "}
                        {payment.createdAt
                          ? formatDate(payment.createdAt)
                          : "recently"}
                      </p>
                    </div>
                    <p className="font-semibold text-on-surface">
                      {formatMoney(payment.amount, payment.currency)}
                    </p>
                    <StatusBadge status={payment.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardShell>
  );
}

function Metric({
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
      <p className="mt-1 font-headline text-xl font-semibold text-on-surface">
        {value}
      </p>
    </div>
  );
}

function FundingStage({
  label,
  amount,
  currency,
  state,
}: {
  label: string;
  amount: number | null;
  currency: string;
  state: string;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
      <p className="text-sm font-semibold text-on-surface">{label}</p>
      <p className="mt-1 font-headline text-2xl font-semibold text-on-surface">
        {formatMoney(amount, currency)}
      </p>
      <p className="mt-1 text-xs text-on-surface-variant">{state}</p>
    </div>
  );
}
