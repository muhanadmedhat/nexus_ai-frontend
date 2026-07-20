"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  ClipboardCheck,
  FileText,
  ListChecks,
  XCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  getFreelancerProjectAssignment,
  updateRoleAssignmentStatus,
  type FreelancerProjectAssignmentDetail,
  type RoleAssignment,
  type RoleBrief,
} from "@/services/matching";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui/status-badge";

function roleLabel(role?: string | null) {
  if (!role) return "Planning role";
  if (role === "ui_ux" || role === "uiux") return "UI/UX";
  if (role === "architect" || role === "architecture") return "Architecture";
  return role.replace(/_/g, " ");
}

function safeList(value?: string[] | null) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function BriefList({ title, items }: { title: string; items?: string[] | null }) {
  const list = safeList(items);
  if (!list.length) return null;

  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
      <h3 className="font-headline text-base font-semibold text-on-surface">
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
        {list.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-container" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function FreelancerProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();
  const [detail, setDetail] = useState<FreelancerProjectAssignmentDetail | null>(
    null,
  );
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    getFreelancerProjectAssignment(projectId)
      .then((result) => {
        setDetail(result);
        setSelectedAssignmentId(result.assignments[0]?.id ?? null);
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Could not load assignment";
        toast.error("Could not load assignment", message);
      })
      .finally(() => setLoading(false));
  }, [projectId, toast]);

  const assignments = detail?.assignments ?? [];
  const assignment = useMemo(
    () =>
      assignments.find((item) => item.id === selectedAssignmentId) ??
      assignments[0] ??
      null,
    [assignments, selectedAssignmentId],
  );
  const roleBrief: RoleBrief | null = assignment?.roleBrief ?? null;

  const handleStatusChange = async (
    target: RoleAssignment,
    newStatus: "accepted" | "declined" | "in_progress",
  ) => {
    setActionLoading(newStatus);
    try {
      const updated = await updateRoleAssignmentStatus(target.id, {
        status: newStatus,
      });
      toast.success("Status updated", `Assignment moved to ${newStatus}`);
      setDetail((current) =>
        current
          ? {
              ...current,
              assignments: current.assignments.map((item) =>
                item.id === target.id ? { ...item, ...updated } : item,
              ),
            }
          : current,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update assignment";
      toast.error("Status update failed", message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardShell
      role="freelancer"
      title="Assignment Details"
      subtitle="Review your role-specific brief and submit planning deliverables."
    >
      <Link
        href="/freelancer/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary-container"
      >
        <ArrowLeft size={16} /> Back to my projects
      </Link>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading assignment...</p>
      ) : !detail || !assignment ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center card-shadow">
          <p className="font-semibold text-on-surface">Assignment not found.</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            This project is not assigned to your freelancer profile.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-5">
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                    {roleLabel(assignment.roleKey)} planning assignment
                  </p>
                  <h2 className="mt-1 font-headline text-2xl font-semibold text-on-surface">
                    {detail.project.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                    {detail.project.description ||
                      detail.brief.summary ||
                      "Project details are being prepared."}
                  </p>
                </div>
                <StatusBadge status={assignment.status} />
              </div>

              {assignments.length > 1 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {assignments.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedAssignmentId(item.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        item.id === assignment.id
                          ? "bg-primary-container text-on-primary"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {roleLabel(item.roleKey)}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-primary-container/10 p-2 text-primary-container">
                  <ClipboardCheck size={20} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-headline text-xl font-semibold text-on-surface">
                      {roleBrief?.title || `${roleLabel(assignment.roleKey)} brief`}
                    </h3>
                    {assignment.roleBriefStatus ? (
                      <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                        {assignment.roleBriefStatus}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {roleBrief?.summary ||
                      detail.brief.summary ||
                      "Use the project brief and your role expectations to prepare the planning deliverable."}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <BriefList title="Objectives" items={roleBrief?.objectives} />
              <BriefList
                title="Responsibilities"
                items={roleBrief?.responsibilities}
              />
              <BriefList
                title="Expected deliverables"
                items={roleBrief?.expectedDeliverables}
              />
              <BriefList
                title="Acceptance criteria"
                items={roleBrief?.acceptanceCriteria}
              />
              <BriefList
                title="Required inputs"
                items={roleBrief?.requiredInputs}
              />
              <BriefList
                title="Handoff checklist"
                items={roleBrief?.handoffChecklist}
              />
            </div>

            {safeList(roleBrief?.suggestedQuestions).length ? (
              <BriefList
                title="Questions to clarify"
                items={roleBrief?.suggestedQuestions}
              />
            ) : null}
          </main>

          <aside className="space-y-4">
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
              <h3 className="font-headline text-base font-semibold text-on-surface">
                Your Assignment
              </h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Role</span>
                  <span className="font-semibold text-on-surface">
                    {roleLabel(assignment.roleKey)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Phase</span>
                  <span className="font-semibold capitalize text-on-surface">
                    {assignment.phase}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Budget</span>
                  <span className="font-semibold text-on-surface">
                    {detail.project.budgetMin} - {detail.project.budgetMax}{" "}
                    {detail.project.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Deadline</span>
                  <span className="font-semibold text-on-surface">
                    {detail.project.deadline
                      ? new Date(detail.project.deadline).toLocaleDateString()
                      : detail.project.isDeadlineFlexible
                        ? "Flexible"
                        : "Not set"}
                  </span>
                </div>
              </div>

              {assignment.status === "assigned" ? (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleStatusChange(assignment, "accepted")}
                    loading={actionLoading === "accepted"}
                    className="!w-full px-3 py-2 text-sm"
                  >
                    <CheckCircle size={15} />
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleStatusChange(assignment, "declined")}
                    loading={actionLoading === "declined"}
                    variant="outline"
                    className="!w-full px-3 py-2 text-sm text-error hover:bg-error/10"
                  >
                    <XCircle size={15} />
                    Decline
                  </Button>
                </div>
              ) : null}

              {assignment.status === "accepted" ? (
                <Button
                  onClick={() => handleStatusChange(assignment, "in_progress")}
                  loading={actionLoading === "in_progress"}
                  className="mt-5 !w-full px-3 py-2 text-sm"
                >
                  <ListChecks size={15} />
                  Start work
                </Button>
              ) : null}

              {["in_progress", "completed"].includes(assignment.status) ? (
                <Link href={`/freelancer/projects/${projectId}/planning`}>
                  <Button variant="outline" className="mt-5 !w-full px-3 py-2 text-sm">
                    <FileText size={15} />
                    Planning deliverables
                  </Button>
                </Link>
              ) : null}
            </section>

            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
              <h3 className="font-headline text-base font-semibold text-on-surface">
                Confirmed project context
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ["Domain", detail.brief.businessDomain],
                  ["Goal", detail.brief.mainGoal],
                  ["Users", detail.brief.targetUsers],
                  ["Platforms", detail.brief.platforms],
                  ["Features", detail.brief.coreFeatures],
                  ["Preferences", detail.brief.constraintsPreferences],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label}>
                      <dt className="font-semibold text-on-surface">{label}</dt>
                      <dd className="mt-1 leading-6 text-on-surface-variant">
                        {value}
                      </dd>
                    </div>
                  ) : null,
                )}
              </dl>
            </section>
          </aside>
        </div>
      )}
    </DashboardShell>
  );
}
