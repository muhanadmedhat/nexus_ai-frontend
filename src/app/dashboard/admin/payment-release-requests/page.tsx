"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Send, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { DeliveryEmpty, DeliveryError, DeliveryLoading } from "@/components/delivery";
import { toNumber } from "@/components/delivery/helpers";
import {
  listAdminReleaseRequests,
  reviewReleaseRequest,
} from "@/services/release-requests";
import { formatDate, formatMoney } from "@/utils/format";
import type { PaymentReleaseRequest, ReleaseRequestStatus } from "@/types/delivery";

const FILTERS: { value: ReleaseRequestStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "released", label: "Released" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

type Decision = "approve_release" | "approve_only" | "reject";

export default function AdminPaymentReleaseRequestsPage() {
  const toast = useToast();
  const [requests, setRequests] = useState<PaymentReleaseRequest[]>([]);
  const [status, setStatus] = useState<ReleaseRequestStatus | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    listAdminReleaseRequests(status === "all" ? undefined : { status })
      .then((result) => {
        setRequests(result.items);
        setError(null);
      })
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : "Could not load release requests",
        ),
      )
      .finally(() => setLoading(false));
  }, [status, reloadKey]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const decide = async (request: PaymentReleaseRequest, decision: Decision) => {
    setActing(`${request.id}:${decision}`);
    try {
      const result = await reviewReleaseRequest(request.id, {
        decision: decision === "reject" ? "rejected" : "approved",
        releaseNow: decision === "approve_release",
      });

      toast.success(
        decision === "reject"
          ? "Release rejected"
          : decision === "approve_release"
            ? "Released to the ledger"
            : "Approved",
        decision === "approve_release"
          ? `Ledger entry written · transfer mode ${result.transferMode}`
          : undefined,
      );
      refresh();
    } catch (caught) {
      toast.error(
        "Could not save your decision",
        caught instanceof Error ? caught.message : "Please try again.",
      );
    } finally {
      setActing(null);
    }
  };

  return (
    <DashboardShell
      role="admin"
      title="Escrow Releases"
      subtitle="Approve or reject freelancer payment release requests. Sprint 5 releases are ledger-only."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => {
              setLoading(true);
              setStatus(filter.value);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              status === filter.value
                ? "bg-primary-container text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <DeliveryLoading label="Loading release requests" />
      ) : error ? (
        <DeliveryError message={error} onRetry={refresh} />
      ) : requests.length === 0 ? (
        <DeliveryEmpty
          title="No release requests"
          description="Requests appear here once a freelancer or customer asks for an approved submission to be paid out."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const pending = request.status === "pending";
            const approvedNotReleased = request.status === "approved";

            return (
              <section
                key={request.id}
                className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-headline text-xl font-semibold text-on-surface">
                        {formatMoney(toNumber(request.amount), request.currency)}
                      </span>
                      <StatusBadge status={request.status} />
                      <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
                        ledger_only
                      </span>
                    </div>
                    {request.reason && (
                      <p className="mt-2 text-sm text-on-surface-variant">{request.reason}</p>
                    )}
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="text-on-surface-variant">Project</dt>
                        <dd className="min-w-0 truncate text-on-surface">
                          {request.projectId}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-on-surface-variant">Milestone</dt>
                        <dd className="min-w-0 truncate text-on-surface">
                          {request.milestoneId ?? "—"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-on-surface-variant">Submission</dt>
                        <dd className="min-w-0 truncate text-on-surface">
                          {request.submissionId ?? "—"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-on-surface-variant">Requested</dt>
                        <dd className="text-on-surface">{formatDate(request.createdAt)}</dd>
                      </div>
                    </dl>
                  </div>

                  {(pending || approvedNotReleased) && (
                    <div className="flex flex-wrap gap-2">
                      {pending && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => decide(request, "approve_release")}
                            loading={acting === `${request.id}:approve_release`}
                            disabled={acting !== null}
                          >
                            <Send size={15} />
                            Approve and release
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => decide(request, "approve_only")}
                            loading={acting === `${request.id}:approve_only`}
                            disabled={acting !== null}
                          >
                            <CheckCircle size={15} />
                            Approve only
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => decide(request, "reject")}
                            loading={acting === `${request.id}:reject`}
                            disabled={acting !== null}
                            className="text-error hover:bg-error/10"
                          >
                            <XCircle size={15} />
                            Reject
                          </Button>
                        </>
                      )}
                      {approvedNotReleased && (
                        <Button
                          size="sm"
                          onClick={() => decide(request, "approve_release")}
                          loading={acting === `${request.id}:approve_release`}
                          disabled={acting !== null}
                        >
                          <Send size={15} />
                          Release now
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
