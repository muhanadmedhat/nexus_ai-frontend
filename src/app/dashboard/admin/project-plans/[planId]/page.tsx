"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareWarning,
  XCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  getProjectPlanDetail,
  materializeProjectPlan,
  reviewProjectPlan,
  type ProjectPlan,
} from "@/services/planning";

type PlanMilestone = {
  clientKey?: string | null;
  title?: string | null;
  description?: string | null;
  budgetAmount?: number | string | null;
  currency?: string | null;
};

type PlanTask = {
  clientKey?: string | null;
  key?: string | null;
  title?: string | null;
  roleKey?: string | null;
  budgetAmount?: number | string | null;
  currency?: string | null;
  estimatedHours?: number | string | null;
};

type PlanDetail = Omit<ProjectPlan, "milestones" | "tasks" | "dependencies"> & {
  milestones?: PlanMilestone[];
  tasks?: PlanTask[];
  dependencies?: unknown[];
};

export default function AdminProjectPlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const toast = useToast();
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!planId) return Promise.resolve();
    return getProjectPlanDetail(planId)
      .then((nextPlan) => {
        setPlan(nextPlan as PlanDetail);
        setNotes(nextPlan.adminNotes || "");
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Could not load project plan";
        toast.error("Could not load project plan", message);
      })
      .finally(() => setLoading(false));
  }, [planId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(
    status: "approved" | "changes_requested" | "rejected",
    materialize = false,
  ) {
    if (!planId) return;
    if (status === "changes_requested" && !notes.trim()) {
      toast.error(
        "Feedback is required",
        "Describe what the revised plan must change.",
      );
      return;
    }
    const key = materialize ? "approved_materialize" : status;
    setActionLoading(key);
    try {
      const result = await reviewProjectPlan(planId, {
        status,
        adminNotes: notes.trim() || undefined,
        materialize,
      });
      const matching = result.materialization?.matchingDispatch;
      const regeneration = result.regeneration;
      toast.success(
        status === "changes_requested"
          ? "Plan revision requested"
          : materialize
          ? "Plan materialized and matching started"
          : "Plan reviewed",
        status === "changes_requested"
          ? regeneration?.queued === false
            ? "The feedback was saved. Automatic recovery will retry plan generation shortly."
            : "A revised plan was queued with your feedback and will return for review automatically."
          : materialize
          ? matching?.triggered
            ? `${matching.runs?.length ?? 0} task matching runs were created. Review the ranked candidates before assigning freelancers.`
            : "Tasks were created. Matching was already started or there were no unmatched tasks."
          : `Marked as ${status.replace("_", " ")}.`,
      );
      await load();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not review project plan";
      toast.error("Review failed", message);
    } finally {
      setActionLoading(null);
    }
  }

  async function materializeApproved() {
    if (!planId) return;
    setActionLoading("materialize");
    try {
      const result = await materializeProjectPlan(planId, {
        replaceExisting: false,
      });
      toast.success(
        "Plan materialized",
        result.matchingDispatch?.triggered
          ? `${result.matchingDispatch.runs?.length ?? 0} task matching runs started automatically. Review candidates before assigning freelancers.`
          : "Milestones and tasks are available; matching was already started or no unmatched tasks remain.",
      );
      await load();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not materialize project plan";
      toast.error("Materialization failed", message);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <DashboardShell
      role="admin"
      title="Scrum Plan Review"
      subtitle="Approve AI-generated milestones and tasks before implementation starts."
    >
      <Link
        href={
          plan?.projectId
            ? `/dashboard/admin/projects/${plan.projectId}`
            : "/dashboard/admin/reviews"
        }
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft size={16} />
        {plan?.projectId ? "Project workspace" : "Review queue"}
      </Link>

      {loading ? (
        <p>Loading...</p>
      ) : !plan ? (
        <p>Plan not found.</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-6">
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Project plan v{plan.version}
                  </p>
                  <h3 className="mt-2 font-headline text-xl font-semibold text-on-surface">
                    Plan overview
                  </h3>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-on-surface-variant">
                    {plan.summary || "No summary provided."}
                  </p>
                </div>
                <StatusBadge status={plan.status} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-surface-container-low p-4">
                  <p className="text-xs text-on-surface-variant">Milestones</p>
                  <p className="mt-1 text-2xl font-semibold text-on-surface">
                    {plan.milestones?.length || 0}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-container-low p-4">
                  <p className="text-xs text-on-surface-variant">Tasks</p>
                  <p className="mt-1 text-2xl font-semibold text-on-surface">
                    {plan.tasks?.length || 0}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-container-low p-4">
                  <p className="text-xs text-on-surface-variant">
                    Dependencies
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-on-surface">
                    {plan.dependencies?.length || 0}
                  </p>
                </div>
              </div>
            </section>

            {plan.budgetAllocation && (
              <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
                <h4 className="font-headline text-lg font-semibold text-on-surface">
                  Compensation envelope
                </h4>
                <p className="mt-1 text-sm text-on-surface-variant">
                  The generated tasks share only the implementation pool; UI/UX
                  and architecture compensation remain reserved separately.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    ["UI/UX", plan.budgetAllocation.planning.ui_ux],
                    ["Architecture", plan.budgetAllocation.planning.architect],
                    ["Implementation", plan.budgetAllocation.implementation],
                  ].map(([label, allocation]) => {
                    const item = allocation as {
                      amount: string | number;
                      percentage: number;
                    };
                    return (
                      <div
                        key={String(label)}
                        className="rounded-lg bg-surface-container-low p-4"
                      >
                        <p className="text-xs text-on-surface-variant">
                          {String(label)} · {item.percentage}%
                        </p>
                        <p className="mt-1 text-xl font-semibold text-on-surface">
                          {item.amount} {plan.budgetAllocation?.currency}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <h4 className="font-headline text-lg font-semibold text-on-surface">
                Generated milestones
              </h4>
              <div className="mt-4 grid gap-3">
                {plan.milestones?.map((m, i) => (
                  <div
                    key={m.clientKey || i}
                    className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {m.clientKey || `M${i + 1}`}
                        </p>
                        <h5 className="mt-1 font-semibold text-on-surface">
                          {m.title}
                        </h5>
                      </div>
                      <span className="text-sm font-semibold text-on-surface">
                        {m.budgetAmount
                          ? `${m.budgetAmount} ${m.currency || ""}`
                          : "Budget TBD"}
                      </span>
                    </div>
                    {m.description && (
                      <p className="mt-2 text-sm text-on-surface-variant">
                        {m.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <h4 className="font-headline text-lg font-semibold text-on-surface">
                Task sample
              </h4>
              <div className="mt-4 grid gap-2">
                {plan.tasks?.slice(0, 12).map((task, i) => (
                  <div
                    key={task.clientKey || task.key || i}
                    className="rounded-lg bg-surface-container-low px-4 py-3 text-sm"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-medium text-on-surface">
                        {task.title}
                      </span>
                      <span className="text-right text-xs text-on-surface-variant">
                        {task.roleKey?.replace("_", " ") || "Unassigned"}
                        {task.budgetAmount != null && task.currency
                          ? ` · ${task.budgetAmount} ${task.currency} allocated`
                          : " · compensation missing"}
                        {task.estimatedHours
                          ? ` · ${task.estimatedHours}h`
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow xl:sticky xl:top-24 xl:self-start">
            <h4 className="font-headline text-lg font-semibold text-on-surface">
              Admin decision
            </h4>
            <p className="mt-1 text-sm text-on-surface-variant">
              Approving and materializing creates the tasks and automatically
              starts AI freelancer matching. You still approve each final
              assignment.
            </p>

            <label
              className="mt-5 block text-sm font-medium text-on-surface"
              htmlFor="plan-notes"
            >
              Admin notes
            </label>
            <textarea
              id="plan-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={7}
              className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm outline-none transition focus:border-primary"
              placeholder="Optional notes about scope, timeline, or changes..."
            />

            <div className="mt-5 grid gap-2">
              {plan.status === "generated" && (
                <>
                  <Button
                    type="button"
                    loading={actionLoading === "approved_materialize"}
                    onClick={() => review("approved", true)}
                  >
                    <ClipboardCheck size={16} /> Approve and materialize
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    loading={actionLoading === "approved"}
                    onClick={() => review("approved")}
                  >
                    <CheckCircle2 size={16} /> Approve only
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    loading={actionLoading === "changes_requested"}
                    onClick={() => review("changes_requested")}
                  >
                    <MessageSquareWarning size={16} /> Request changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-error/30 text-error hover:bg-error/10"
                    loading={actionLoading === "rejected"}
                    onClick={() => review("rejected")}
                  >
                    <XCircle size={16} /> Reject
                  </Button>
                </>
              )}
              {plan.status === "approved" && (
                <Button
                  type="button"
                  variant="outline"
                  loading={actionLoading === "materialize"}
                  onClick={materializeApproved}
                >
                  <ClipboardCheck size={16} /> Materialize approved plan
                </Button>
              )}
              {plan.status === "changes_requested" && (
                <p className="rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">
                  A revised plan is being generated automatically from these
                  notes.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </DashboardShell>
  );
}
