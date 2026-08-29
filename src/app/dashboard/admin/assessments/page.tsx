"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { getAssessments, type AssessmentListItem } from "@/services/admin";
import { Eye, Loader2, CheckCircle, XCircle, AlertCircle, Search, X, Calendar } from "lucide-react";

const statusBadgeColors: Record<string, string> = {
  submitted:
    "border border-outline-variant/50 bg-surface-container-high text-on-surface-variant",
  passed: "border border-primary-container/20 bg-primary-container/10 text-primary-container",
  failed: "border border-error/20 bg-error-container/40 text-error",
  needs_review: "border border-tertiary-container/20 bg-tertiary-container/10 text-tertiary-container",
};

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  passed: "Passed",
  failed: "Failed",
  needs_review: "Needs Review",
};

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("submitted");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minScore, setMinScore] = useState<number | undefined>(undefined);
  const [maxScore, setMaxScore] = useState<number | undefined>(undefined);
  const limit = 20;

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAssessments({
        status: statusFilter,
        page,
        limit,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        minScore,
        maxScore,
      });
      setAssessments(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, dateFrom, dateTo, minScore, maxScore]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadAssessments();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadAssessments]);

  const totalPages = Math.ceil(total / limit);

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
    setMinScore(undefined);
    setMaxScore(undefined);
    setPage(1);
  };

  const hasActiveFilters = search || dateFrom || dateTo || minScore !== undefined || maxScore !== undefined;

  const getRecommendationIcon = (rec: string | null) => {
    if (rec === "pass") return <CheckCircle className="h-4 w-4 text-primary-container" />;
    if (rec === "fail") return <XCircle className="h-4 w-4 text-error" />;
    if (rec === "needs_review") return <AlertCircle className="h-4 w-4 text-tertiary-container" />;
    return null;
  };

  return (
    <DashboardShell
      role="admin"
      title="Assessment Review Queue"
      subtitle="Review submitted assessments and make pass/fail decisions."
    >
      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["submitted", "passed", "failed", "needs_review"].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === status
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
            placeholder="Search freelancer..."
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
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-3 py-2 text-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
            aria-label="Date from"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-3 py-2 text-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
            aria-label="Date to"
          />
        </div>

        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="Min %"
            value={minScore ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseFloat(e.target.value) : undefined;
              setMinScore(val);
              setPage(1);
            }}
            className="w-20 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
          />
          <span className="text-on-surface-variant">—</span>
          <input
            type="number"
            placeholder="Max %"
            value={maxScore ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseFloat(e.target.value) : undefined;
              setMaxScore(val);
              setPage(1);
            }}
            className="w-20 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
          />
        </div>

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
      ) : assessments.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center text-on-surface-variant">
          No assessments match your filters.
        </div>
      ) : (
        <>
          <div className="admin-responsive-table-wrap rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
            <table className="admin-responsive-table text-left text-sm">
              <thead className="bg-surface-container-high">
                <tr>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Freelancer</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Score</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Recommendation</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Warnings</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Submitted</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => (
                  <tr key={a.id} className="border-t border-outline-variant/20 hover:bg-surface-container-low">
                    <td data-label="Freelancer" className="px-4 py-3 font-medium text-on-surface">{a.freelancerName}</td>
                    <td data-label="Score" className="px-4 py-3 font-medium text-on-surface">{a.score ? `${a.score}%` : "—"}</td>
                    <td data-label="Recommendation" className="px-4 py-3">
                      {a.recommendation ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                          {getRecommendationIcon(a.recommendation)}
                          {a.recommendation}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Warnings" className="px-4 py-3 text-on-surface-variant">{a.warningCount}</td>
                    <td data-label="Status" className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusBadgeColors[a.status] || "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {statusLabels[a.status] || a.status}
                      </span>
                    </td>
                    <td data-label="Submitted" className="px-4 py-3 text-xs text-on-surface-variant">
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : "—"}
                    </td>
                    <td data-label="Action" className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link href={`/dashboard/admin/assessments/${a.id}`}>
                          <Button variant="outline" className="!w-auto px-3 py-2 text-xs">
                            <Eye size={14} />
                            Review
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">
                Showing {assessments.length} of {total}
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
