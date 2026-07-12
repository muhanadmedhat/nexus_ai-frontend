"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { getFreelancers, type FreelancerListItem } from "@/services/admin";
import { Eye, UserCheck, UserX, Clock, Loader2, Search, X, Calendar } from "lucide-react";

const statusBadgeColors: Record<string, string> = {
  assessment_submitted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  interview_pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const statusLabels: Record<string, string> = {
  assessment_submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  interview_pending: "Interview Pending",
};

export default function AdminFreelancersPage() {
  const [freelancers, setFreelancers] = useState<FreelancerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("assessment_submitted");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [skills, setSkills] = useState("");
  const limit = 20;

  useEffect(() => {
    const load = async () => {
      try {
        const skillsArray = skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
        const result = await getFreelancers({
          status: statusFilter,
          page,
          limit,
          search: search || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          skills: skillsArray,
        });
        setFreelancers(result.data);
        setTotal(result.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load freelancers");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, statusFilter, search, dateFrom, dateTo, skills]);

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
    setSkills("");
    setPage(1);
  };

  const hasActiveFilters = search || dateFrom || dateTo || skills;

  return (
    <DashboardShell
      role="admin"
      title="Freelancer Verification Queue"
      subtitle="Review submitted freelancer assessments and approve or reject."
    >
      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["assessment_submitted", "approved", "rejected", "interview_pending"].map((status) => (
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

        <input
          type="text"
          placeholder="Skills (comma separated)"
          value={skills}
          onChange={(e) => { setSkills(e.target.value); setPage(1); }}
          className="min-w-[150px] rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
        />

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
          <p className="text-on-surface-variant">No freelancers match your filters.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-high">
                <tr>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Name</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Headline</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Skills</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Score</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Submitted</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {freelancers.map((f) => (
                  <tr key={f.id} className="border-t border-outline-variant/20 hover:bg-surface-container-low">
                    <td className="px-4 py-3 font-medium text-on-surface">{f.name}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{f.headline || "—"}</td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {f.skills?.slice(0, 3).join(", ")}
                      {f.skills?.length > 3 && ` +${f.skills.length - 3}`}
                    </td>
                    <td className="px-4 py-3 font-medium text-on-surface">
                      {f.assessmentScore ? `${f.assessmentScore}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColors[f.verificationStatus] || "bg-surface-container-high text-on-surface-variant"}`}
                      >
                        {statusLabels[f.verificationStatus] || f.verificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                      {f.assessmentSubmittedAt
                        ? new Date(f.assessmentSubmittedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/admin/freelancers/${f.id}`}>
                        <Button variant="outline" className="inline-flex items-center gap-1 px-3 py-1.5 text-sm">
                          <Eye size={14} />
                          Review
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
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
                  className="px-3 py-1.5 text-sm disabled:opacity-50"
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
                  className="px-3 py-1.5 text-sm disabled:opacity-50"
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