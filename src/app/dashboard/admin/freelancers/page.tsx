"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  getFreelancers,
  updateFreelancerVerification,
  type FreelancerListItem,
} from "@/services/admin";
import { useToast } from "@/components/ui/toast";
import {
  Calendar,
  CheckCircle,
  Eye,
  Loader2,
  Search,
  X,
  XCircle,
} from "lucide-react";

const statusBadgeColors: Record<string, string> = {
  cv_processing:
    "border border-primary-container/20 bg-primary-container/10 text-primary-container",
  cv_extraction_failed:
    "border border-error/20 bg-error-container/40 text-error",
  assessment_pending:
    "border border-outline-variant/50 bg-surface-container-high text-on-surface-variant",
  assessment_generation_failed:
    "border border-error/20 bg-error-container/40 text-error",
  assessment_submitted:
    "border border-outline-variant/50 bg-surface-container-high text-on-surface-variant",
  approved:
    "border border-primary-container/20 bg-primary-container/10 text-primary-container",
  rejected: "border border-error/20 bg-error-container/40 text-error",
  interview_pending:
    "border border-tertiary-container/20 bg-tertiary-container/10 text-tertiary-container",
};

const statusLabels: Record<string, string> = {
  cv_processing: "Reading CV",
  cv_extraction_failed: "CV Failed",
  assessment_pending: "Assessment Pending",
  assessment_generation_failed: "Assessment Failed",
  assessment_submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  interview_pending: "Interview Pending",
};

function formatPercent(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}%` : `${value}%`;
}

function formatSkillScore(value: string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : "-";
}

function getSkillBadgeClass(value: string | null | undefined) {
  const score = Number(value);
  if (Number.isFinite(score) && score >= 4) {
    return "border-primary-container/30 bg-primary-container/10 text-primary-container";
  }
  if (Number.isFinite(score) && score >= 2.5) {
    return "border-amber-300/70 bg-amber-50 text-amber-800";
  }
  return "border-outline-variant/50 bg-surface-container-high text-on-surface-variant";
}

function isFinalVerificationStatus(status: string) {
  return status === "approved" || status === "rejected";
}

export default function AdminFreelancersPage() {
  const toast = useToast();
  const [freelancers, setFreelancers] = useState<FreelancerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>(
    "assessment_submitted",
  );
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [skills, setSkills] = useState("");
  const [principalReviewerFilter, setPrincipalReviewerFilter] = useState("");
  const limit = 20;

  const loadFreelancers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const skillsArray = skills
        ? skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
        : undefined;
      const result = await getFreelancers({
        status: statusFilter,
        page,
        limit,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        skills: skillsArray,
        principalReviewerStatus: principalReviewerFilter || undefined,
      });
      setFreelancers(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load freelancers",
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    statusFilter,
    search,
    dateFrom,
    dateTo,
    skills,
    principalReviewerFilter,
  ]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadFreelancers();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadFreelancers]);

  const totalPages = Math.ceil(total / limit);

  const handleDecision = async (
    id: string,
    status: "approved" | "rejected" | "interview_pending",
  ) => {
    if (status === "rejected" && rejectingId !== id) {
      setRejectingId(id);
      setRejectReason("");
      return;
    }

    if (status === "rejected" && !rejectReason.trim()) {
      setError("Please provide a reason before rejecting this freelancer.");
      return;
    }

    setActioning(`${id}:${status}`);
    setError(null);

    try {
      await updateFreelancerVerification(id, {
        status,
        reason: status === "rejected" ? rejectReason.trim() : undefined,
      });
      toast.success(
        status === "approved"
          ? "Freelancer approved"
          : status === "rejected"
            ? "Freelancer rejected"
            : "Marked for review",
      );
      setRejectingId(null);
      setRejectReason("");
      await loadFreelancers();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update freelancer";
      setError(message);
      toast.error("Action failed", message);
    } finally {
      setActioning(null);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearch(searchInput);
      setPage(1);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setSkills("");
    setPrincipalReviewerFilter("");
    setPage(1);
  };

  const hasActiveFilters =
    search || dateFrom || dateTo || skills || principalReviewerFilter;

  return (
    <DashboardShell
      role="admin"
      title="Freelancer Verification Queue"
      subtitle="Review submitted freelancer assessments and approve or reject."
    >
      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setStatusFilter("");
            setPrincipalReviewerFilter("pending");
            setPage(1);
          }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            !statusFilter && principalReviewerFilter === "pending"
              ? "bg-primary-container text-on-primary-container"
              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          Reviewer applications
        </button>
        {[
          "assessment_submitted",
          "approved",
          "rejected",
          "interview_pending",
        ].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPrincipalReviewerFilter("");
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === status && !principalReviewerFilter
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {statusLabels[status] || status}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-3 py-2 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-3 py-2 text-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
            aria-label="Date from"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-3 py-2 text-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
            aria-label="Date to"
          />
        </div>

        <input
          type="text"
          placeholder="Skills (comma separated)"
          value={skills}
          onChange={(e) => {
            setSkills(e.target.value);
            setPage(1);
          }}
          className="min-w-[150px] rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
        />

        <select
          value={principalReviewerFilter}
          onChange={(event) => {
            setPrincipalReviewerFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
          aria-label="Principal reviewer status"
        >
          <option value="">All reviewer statuses</option>
          <option value="pending">Reviewer applications</option>
          <option value="approved">Qualified reviewers</option>
          <option value="suspended">Suspended reviewers</option>
          <option value="rejected">Rejected reviewers</option>
          <option value="not_applied">Not applied</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low"
          >
            <X size={16} />
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          {error}
        </div>
      ) : freelancers.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center">
          <p className="text-on-surface-variant">
            No freelancers match your filters.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-high">
                <tr>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Freelancer
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Headline
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Top skills
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Score
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Reviewer
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">
                    Submitted
                  </th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {freelancers.map((freelancer) => {
                  const topScores =
                    freelancer.topSkillScores?.slice(0, 3) ?? [];
                  const fallbackSkills = freelancer.skills?.slice(0, 3) ?? [];
                  const isFinalStatus = isFinalVerificationStatus(
                    freelancer.verificationStatus,
                  );

                  return (
                    <tr
                      key={freelancer.id}
                      className="border-t border-outline-variant/20 hover:bg-surface-container-low"
                    >
                      <td className="min-w-48 px-4 py-4">
                        <p className="font-semibold text-on-surface">
                          {freelancer.name}
                        </p>
                        <p className="mt-1 max-w-56 truncate text-xs text-on-surface-variant">
                          {freelancer.email}
                        </p>
                      </td>
                      <td className="max-w-60 px-4 py-4 text-on-surface-variant">
                        <p className="line-clamp-2">
                          {freelancer.headline || "-"}
                        </p>
                      </td>
                      <td className="min-w-72 px-4 py-4">
                        {topScores.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {topScores.map((skill) => (
                              <span
                                key={skill.id}
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getSkillBadgeClass(skill.score)}`}
                              >
                                {skill.skill}
                                <span className="opacity-80">
                                  {formatSkillScore(skill.score)}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : fallbackSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {fallbackSkills.map((skill) => (
                              <span
                                key={skill}
                                className="rounded-full border border-outline-variant/50 bg-surface-container-high px-2.5 py-1 text-xs font-medium text-on-surface-variant"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-on-surface-variant">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-semibold text-on-surface">
                        {formatPercent(freelancer.assessmentScore)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeColors[freelancer.verificationStatus] || "border border-outline-variant/50 bg-surface-container-high text-on-surface-variant"}`}
                        >
                          {statusLabels[freelancer.verificationStatus] ||
                            freelancer.verificationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-block rounded-full border border-outline-variant/50 bg-surface-container-high px-2.5 py-1 text-xs font-semibold capitalize text-on-surface-variant">
                          {freelancer.principalReviewerStatus.replaceAll(
                            "_",
                            " ",
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-on-surface-variant">
                        {freelancer.assessmentSubmittedAt
                          ? new Date(
                              freelancer.assessmentSubmittedAt,
                            ).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="w-[260px] min-w-[260px] px-3 py-4 text-right">
                        {isFinalStatus ? (
                          <div className="flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${statusBadgeColors[freelancer.verificationStatus]}`}
                            >
                              {freelancer.verificationStatus === "approved" ? (
                                <CheckCircle size={13} />
                              ) : (
                                <XCircle size={13} />
                              )}
                              {statusLabels[freelancer.verificationStatus]}
                            </span>
                            <Link
                              href={`/dashboard/admin/freelancers/${freelancer.id}`}
                            >
                              <Button
                                variant="outline"
                                className="!w-auto rounded-full px-2.5 py-1.5 text-[11px]"
                              >
                                <Eye size={13} />
                                Review
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <div className="flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
                            <Button
                              type="button"
                              className="!w-auto rounded-full px-2.5 py-1.5 text-[11px]"
                              loading={
                                actioning === `${freelancer.id}:approved`
                              }
                              disabled={Boolean(actioning)}
                              onClick={() =>
                                handleDecision(freelancer.id, "approved")
                              }
                            >
                              <CheckCircle size={13} />
                              Approve
                            </Button>
                            <Link
                              href={`/dashboard/admin/freelancers/${freelancer.id}`}
                            >
                              <Button
                                variant="outline"
                                className="!w-auto rounded-full px-2.5 py-1.5 text-[11px]"
                              >
                                <Eye size={13} />
                                Review
                              </Button>
                            </Link>
                            <Button
                              type="button"
                              className="!w-auto rounded-full bg-error px-2.5 py-1.5 text-[11px] text-on-error hover:bg-error/80"
                              loading={
                                actioning === `${freelancer.id}:rejected`
                              }
                              disabled={Boolean(actioning)}
                              onClick={() =>
                                handleDecision(freelancer.id, "rejected")
                              }
                            >
                              <XCircle size={13} />
                              Reject
                            </Button>
                          </div>
                        )}
                        {!isFinalStatus && rejectingId === freelancer.id ? (
                          <div className="mt-3 rounded-xl border border-error/20 bg-error-container/10 p-3 text-left">
                            <textarea
                              value={rejectReason}
                              onChange={(event) =>
                                setRejectReason(event.target.value)
                              }
                              rows={2}
                              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-error"
                              placeholder="Reason for rejection"
                            />
                            <div className="mt-2 flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason("");
                                }}
                                disabled={Boolean(actioning)}
                                className="!w-auto px-3 py-1.5 text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={() =>
                                  handleDecision(freelancer.id, "rejected")
                                }
                                loading={
                                  actioning === `${freelancer.id}:rejected`
                                }
                                disabled={
                                  Boolean(actioning) || !rejectReason.trim()
                                }
                                className="!w-auto bg-error px-3 py-1.5 text-xs text-on-error hover:bg-error/80"
                              >
                                Confirm reject
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">
                Showing {freelancers.length} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="!w-auto px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm text-on-surface-variant">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  className="!w-auto px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
