"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Lock, Send, Save } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  DeliveryEmpty,
  DeliveryRetryBanner,
  EvidenceList,
} from "@/components/delivery";
import {
  acceptanceCriteriaList,
  canSubmitTask,
  dependencyTaskIds,
  indexTasksById,
} from "@/components/delivery/helpers";
import {
  getMilestones,
  getTasks,
  type ProjectMilestone,
} from "@/services/planning";
import { getMyFreelancerProfile } from "@/services/freelancers";
import {
  createDeliverySubmission,
  getDeliverySubmission,
  listDeliverySubmissions,
  submitDeliverySubmission,
  updateDeliverySubmission,
  type CreateSubmissionPayload,
  type SubmissionDetail,
  type UpdateSubmissionPayload,
} from "@/services/project-submissions";
import { listRevisionRequests } from "@/services/revisions";
import { formatDate } from "@/utils/format";
import type {
  DeliveryTask,
  EvaluationRun,
  ProjectRevisionRequest,
  ProjectSubmission,
  ProjectSubmissionReview,
  SubmissionType,
} from "@/types/delivery";

function FreelancerEvaluation({ run }: { run: EvaluationRun }) {
  const rubric = run.acceptanceCoverage?.items ?? run.findings?.rubric ?? [];
  const revisionNotes = run.findings?.revisionNotes?.trim();

  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-headline text-base font-semibold text-on-surface">
          Evaluation
        </h3>
        <StatusBadge status={run.status} />
      </div>
      {run.recommendation && (
        <p className="mt-2 text-sm text-on-surface-variant">
          Recommendation: {run.recommendation.replace(/_/g, " ")}
          {run.score != null ? ` · ${run.score}/100` : ""}
        </p>
      )}
      {run.summary && (
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          {run.summary}
        </p>
      )}
      {rubric.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rubric.map((item, index) => (
            <li
              key={`${index}-${item.criterion}`}
              className="rounded-lg bg-surface-container-low p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-on-surface">
                  {item.criterion}
                </span>
                <StatusBadge
                  status={item.status ?? (item.met ? "met" : "unmet")}
                />
              </div>
              {item.evidence && (
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                  {item.evidence}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {revisionNotes && (
        <p className="mt-3 rounded-lg bg-error/10 p-3 text-sm leading-6 text-error">
          {revisionNotes}
        </p>
      )}
    </section>
  );
}

const SUBMISSION_TYPES: { value: SubmissionType; label: string }[] = [
  { value: "pull_request", label: "Pull request" },
  { value: "repository", label: "Repository" },
  { value: "file", label: "File evidence" },
  { value: "figma", label: "Figma" },
  { value: "text", label: "Text only" },
];

interface FormState {
  submissionType: SubmissionType;
  title: string;
  summary: string;
  repoUrl: string;
  branchName: string;
  pullRequestUrl: string;
  commitSha: string;
  notes: string;
  screenshots: string;
  attachments: string;
}

const EMPTY_FORM: FormState = {
  submissionType: "pull_request",
  title: "",
  summary: "",
  repoUrl: "",
  branchName: "",
  pullRequestUrl: "",
  commitSha: "",
  notes: "",
  screenshots: "",
  attachments: "",
};

function toUrlList(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formFromSubmission(submission: ProjectSubmission): FormState {
  return {
    submissionType: submission.submissionType ?? "pull_request",
    title: submission.title ?? "",
    summary: submission.summary ?? "",
    repoUrl: submission.repoUrl ?? "",
    branchName: submission.branchName ?? "",
    pullRequestUrl: submission.pullRequestUrl ?? "",
    commitSha: submission.commitSha ?? "",
    notes:
      typeof submission.content?.notes === "string"
        ? submission.content.notes
        : "",
    screenshots: (submission.fileUrls?.screenshots ?? []).join("\n"),
    attachments: (submission.fileUrls?.attachments ?? []).join("\n"),
  };
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-on-surface">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="input-halo w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-all placeholder:text-outline/50"
      />
    </div>
  );
}

function SubmissionReceipt({
  submission,
  review,
  onRevise,
}: {
  submission: ProjectSubmission;
  review?: ProjectSubmissionReview | null;
  onRevise?: () => void;
}) {
  const notes =
    typeof submission.content?.notes === "string"
      ? submission.content.notes
      : null;
  const requestedChanges = review?.requestedChanges?.items ?? [];

  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
            Submission receipt · version {submission.version}
          </p>
          <h3 className="mt-1 font-headline text-xl font-semibold text-on-surface">
            {submission.title || "Untitled submission"}
          </h3>
        </div>
        <StatusBadge status={submission.status} />
      </div>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">
        {submission.status === "submitted" ||
        submission.status === "under_review"
          ? "Your answers and evidence are locked while evaluation and admin review are in progress. This page updates automatically when a decision is made."
          : submission.status === "approved"
            ? "The admin approved this task. Its allocated amount is now included in your approved earnings."
            : submission.status === "rejected"
              ? "The admin rejected this version. Review the feedback below before creating a revised submission."
              : `This submission is ${submission.status.replace(/_/g, " ")}.`}
      </p>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        {submission.summary && (
          <div className="sm:col-span-2">
            <dt className="font-semibold text-on-surface">Summary</dt>
            <dd className="mt-1 whitespace-pre-wrap leading-6 text-on-surface-variant">
              {submission.summary}
            </dd>
          </div>
        )}
        {notes && (
          <div className="sm:col-span-2">
            <dt className="font-semibold text-on-surface">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap leading-6 text-on-surface-variant">
              {notes}
            </dd>
          </div>
        )}
        <div>
          <dt className="font-semibold text-on-surface">Submitted</dt>
          <dd className="mt-1 text-on-surface-variant">
            {submission.submittedAt
              ? formatDate(submission.submittedAt)
              : "Not submitted"}
          </dd>
        </div>
        {submission.reviewedAt && (
          <div>
            <dt className="font-semibold text-on-surface">Reviewed</dt>
            <dd className="mt-1 text-on-surface-variant">
              {formatDate(submission.reviewedAt)}
            </dd>
          </div>
        )}
        {submission.pullRequestUrl && (
          <div className="sm:col-span-2">
            <dt className="font-semibold text-on-surface">Pull request</dt>
            <dd className="mt-1 break-all text-primary-container">
              {submission.pullRequestUrl}
            </dd>
          </div>
        )}
        {submission.commitSha && (
          <div className="sm:col-span-2">
            <dt className="font-semibold text-on-surface">Commit</dt>
            <dd className="mt-1 break-all font-mono text-xs text-on-surface-variant">
              {submission.commitSha}
            </dd>
          </div>
        )}
      </dl>

      {review && (
        <div className="mt-5 rounded-lg bg-surface-container-low p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-on-surface">Admin decision</h4>
            <StatusBadge status={review.decision} />
          </div>
          {review.feedback && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
              {review.feedback}
            </p>
          )}
          {requestedChanges.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-on-surface-variant">
              {requestedChanges.map((item, index) => (
                <li key={index}>
                  •{" "}
                  {typeof item === "string" ? item : item.comment || item.area}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {onRevise && (
        <Button type="button" className="mt-5" onClick={onRevise}>
          Create revised submission
        </Button>
      )}
    </section>
  );
}

export default function FreelancerTaskWorkPage() {
  const { projectId, taskId } = useParams<{
    projectId: string;
    taskId: string;
  }>();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<DeliveryTask[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [revisions, setRevisions] = useState<ProjectRevisionRequest[]>([]);
  const [latestEvaluation, setLatestEvaluation] =
    useState<EvaluationRun | null>(null);
  const [latestDetail, setLatestDetail] = useState<SubmissionDetail | null>(
    null,
  );
  const [startNewVersion, setStartNewVersion] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);

  useEffect(() => {
    if (!projectId || !taskId) return;
    let currentProfileId: string | null = null;

    getMyFreelancerProfile()
      .catch(() => null)
      .then((profile) => {
        currentProfileId = profile?.id ?? null;
        setProfileId(currentProfileId);

        return Promise.allSettled([
          getTasks(projectId, { limit: 200 }),
          getMilestones(projectId),
          listDeliverySubmissions(projectId, { taskId }),
          listRevisionRequests(projectId, { taskId }),
        ]);
      })
      .then(
        ([
          tasksResult,
          milestonesResult,
          submissionsResult,
          revisionsResult,
        ]) => {
          setAllTasks(
            tasksResult.status === "fulfilled"
              ? (tasksResult.value as DeliveryTask[])
              : [],
          );
          setMilestones(
            milestonesResult.status === "fulfilled"
              ? milestonesResult.value
              : [],
          );

          const items =
            submissionsResult.status === "fulfilled"
              ? submissionsResult.value.items
              : [];
          setSubmissions(items);

          // Seed the form from an editable version, so a draft or a version sent
          // back for changes is picked up where the freelancer left off.
          const mine = items.filter(
            (submission) =>
              !currentProfileId ||
              submission.freelancerProfileId === currentProfileId,
          );
          const latest = mine.reduce<ProjectSubmission | null>(
            (best, submission) =>
              !best || submission.version > best.version ? submission : best,
            null,
          );
          setForm(
            latest &&
              (latest.status === "draft" ||
                latest.status === "changes_requested")
              ? formFromSubmission(latest)
              : EMPTY_FORM,
          );

          setRevisions(
            revisionsResult.status === "fulfilled"
              ? revisionsResult.value.items
              : [],
          );

          const failures: string[] = [];
          if (tasksResult.status === "rejected") failures.push("task");
          if (milestonesResult.status === "rejected")
            failures.push("milestone");
          if (submissionsResult.status === "rejected")
            failures.push("submissions");
          if (revisionsResult.status === "rejected")
            failures.push("revision requests");
          setLoadErrors(failures);
        },
      )
      .finally(() => setLoading(false));
  }, [projectId, taskId, reloadKey]);

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadErrors([]);
    setLatestEvaluation(null);
    setLatestDetail(null);
    setStartNewVersion(false);
    setReloadKey((key) => key + 1);
  }, []);

  const task = useMemo(
    () => allTasks.find((item) => item.id === taskId) ?? null,
    [allTasks, taskId],
  );

  const tasksById = useMemo(() => indexTasksById(allTasks), [allTasks]);

  const milestone = useMemo(
    () => milestones.find((item) => item.id === task?.milestoneId) ?? null,
    [milestones, task],
  );

  const latestSubmission = useMemo(() => {
    const mine = submissions.filter(
      (submission) =>
        !profileId || submission.freelancerProfileId === profileId,
    );
    return mine.reduce<ProjectSubmission | null>(
      (latest, submission) =>
        !latest || submission.version > latest.version ? submission : latest,
      null,
    );
  }, [submissions, profileId]);

  useEffect(() => {
    if (!latestSubmission?.id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loadEvaluation = async (): Promise<void> => {
      try {
        const detail = await getDeliverySubmission(latestSubmission.id);
        if (cancelled) return;
        const evaluation =
          detail.latestEvaluationRun ?? detail.evaluationRun ?? null;
        setLatestDetail(detail);
        setLatestEvaluation(evaluation);
        setSubmissions((current) =>
          current.map((submission) =>
            submission.id === detail.id ? detail : submission,
          ),
        );
        if (detail.task) {
          setAllTasks((current) =>
            current.map((item) =>
              item.id === detail.task?.id ? detail.task : item,
            ),
          );
        }
        if (detail.status === "changes_requested") {
          setForm(formFromSubmission(detail));
        }
        if (detail.openRevisionRequests) {
          setRevisions(detail.openRevisionRequests);
        }
        if (
          ["submitted", "under_review"].includes(detail.status) ||
          (evaluation && ["queued", "running"].includes(evaluation.status))
        ) {
          timer = setTimeout(() => void loadEvaluation(), 5_000);
        }
      } catch {
        if (!cancelled) setLatestEvaluation(null);
      }
    };
    void loadEvaluation();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [latestSubmission?.id, latestSubmission?.status]);

  // An editable draft, or a version the reviewer sent back for changes.
  const editableSubmission =
    latestSubmission &&
    (latestSubmission.status === "draft" ||
      latestSubmission.status === "changes_requested")
      ? latestSubmission
      : null;
  const showSubmissionForm =
    !latestSubmission || Boolean(editableSubmission) || startNewVersion;
  const latestReview = latestDetail?.reviews?.[0] ?? null;

  const submitState = useMemo(() => {
    if (!task) return { allowed: false, reason: "Task not found." };
    return canSubmitTask({
      task,
      tasksById,
      currentFreelancerProfileId: profileId,
    });
  }, [task, tasksById, profileId]);

  const dependencies = useMemo(
    () =>
      dependencyTaskIds(task?.dependencies)
        .map((id) => tasksById.get(id) ?? null)
        .filter((item): item is DeliveryTask => item !== null),
    [task, tasksById],
  );

  const criteria = useMemo(
    () => acceptanceCriteriaList(task?.acceptanceCriteria),
    [task],
  );

  const formValues = useCallback(() => {
    const screenshots = toUrlList(form.screenshots);
    const attachments = toUrlList(form.attachments);

    return {
      title: form.title.trim(),
      summary: form.summary.trim(),
      content: form.notes.trim() ? { notes: form.notes.trim() } : null,
      fileUrls:
        screenshots.length || attachments.length
          ? { screenshots, attachments }
          : null,
      repoUrl: form.repoUrl.trim(),
      branchName: form.branchName.trim(),
      pullRequestUrl: form.pullRequestUrl.trim(),
      commitSha: form.commitSha.trim(),
    };
  }, [form]);

  /** Empty fields are simply omitted when creating. */
  const buildCreatePayload = useCallback((): CreateSubmissionPayload => {
    const values = formValues();
    return {
      taskId,
      milestoneId: task?.milestoneId ?? undefined,
      submissionType: form.submissionType,
      title: values.title || undefined,
      summary: values.summary || undefined,
      content: values.content ?? undefined,
      fileUrls: values.fileUrls ?? undefined,
      repoUrl: values.repoUrl || undefined,
      branchName: values.branchName || undefined,
      pullRequestUrl: values.pullRequestUrl || undefined,
      commitSha: values.commitSha || undefined,
    };
  }, [formValues, form.submissionType, taskId, task]);

  /**
   * Empty fields are sent as null when updating. Omitting them would leave the
   * stored value in place, so a freelancer could never clear a URL they had
   * entered by mistake.
   */
  const buildUpdatePayload = useCallback((): UpdateSubmissionPayload => {
    const values = formValues();
    return {
      milestoneId: task?.milestoneId ?? undefined,
      submissionType: form.submissionType,
      title: values.title || null,
      summary: values.summary || null,
      content: values.content,
      fileUrls: values.fileUrls,
      repoUrl: values.repoUrl || null,
      branchName: values.branchName || null,
      pullRequestUrl: values.pullRequestUrl || null,
      commitSha: values.commitSha || null,
    };
  }, [formValues, form.submissionType, task]);

  const handleSaveDraft = async () => {
    setSaving("draft");
    try {
      if (editableSubmission) {
        await updateDeliverySubmission(
          editableSubmission.id,
          buildUpdatePayload(),
        );
      } else {
        await createDeliverySubmission(projectId, {
          ...buildCreatePayload(),
          status: "draft",
        });
      }
      toast.success(
        "Draft saved",
        "Your work is saved but not yet sent for review.",
      );
      refresh();
    } catch (error) {
      toast.error(
        "Could not save draft",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(null);
    }
  };

  const handleSubmit = async () => {
    const commitSha = form.commitSha.trim();
    if (commitSha && !/^[a-fA-F0-9]{40}$/.test(commitSha)) {
      toast.error(
        "Full commit SHA required",
        "Use the exact 40-character Git commit SHA so the evaluator reviews an immutable snapshot.",
      );
      return;
    }
    if (form.submissionType === "repository" && !commitSha) {
      toast.error(
        "Commit SHA required",
        "Repository submissions must identify the exact 40-character commit SHA.",
      );
      return;
    }
    if (form.submissionType === "pull_request" && !form.pullRequestUrl.trim()) {
      toast.error("Pull request required", "Add the GitHub pull-request URL.");
      return;
    }
    setSaving("submit");
    try {
      if (editableSubmission) {
        const savedSubmission = await updateDeliverySubmission(
          editableSubmission.id,
          buildUpdatePayload(),
        );
        await submitDeliverySubmission(savedSubmission.id, {
          summary: form.summary.trim() || undefined,
        });
      } else {
        await createDeliverySubmission(projectId, {
          ...buildCreatePayload(),
          status: "submitted",
        });
      }
      toast.success("Submitted for review", "An evaluation has been queued.");
      refresh();
    } catch (error) {
      toast.error(
        "Could not submit",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(null);
    }
  };

  const openRevisions = revisions.filter(
    (revision) =>
      revision.status === "open" || revision.status === "in_progress",
  );

  return (
    <DashboardShell
      role="freelancer"
      title={task?.title ?? "Task"}
      subtitle="Review the acceptance criteria, then submit your work for review."
    >
      <Link
        href={`/freelancer/projects/${projectId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary-container"
      >
        <ArrowLeft size={16} /> Back to project
      </Link>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading task...</p>
      ) : !task ? (
        <DeliveryEmpty
          title="Task not found"
          description="This task does not exist, or it is not visible to your freelancer profile."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-5">
            {loadErrors.length > 0 && (
              <DeliveryRetryBanner
                title="Some sections could not be loaded"
                message={`Failed to load ${loadErrors.join(", ")}.`}
                onAction={refresh}
              />
            )}

            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-headline text-2xl font-semibold text-on-surface">
                    {task.title}
                  </h2>
                  {milestone && (
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Milestone: {milestone.title}
                    </p>
                  )}
                </div>
                <StatusBadge status={task.status} />
              </div>
              {task.description && (
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  {task.description}
                </p>
              )}
            </section>

            {criteria.length > 0 && (
              <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
                <h3 className="font-headline text-base font-semibold text-on-surface">
                  Acceptance criteria
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                  {criteria.map((criterion) => (
                    <li key={criterion} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-container" />
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {showSubmissionForm ? (
              <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
                <h3 className="font-headline text-xl font-semibold text-on-surface">
                  {editableSubmission
                    ? "Continue your submission"
                    : startNewVersion
                      ? "Revised submission"
                      : "New submission"}
                </h3>
                {latestSubmission && (
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Latest version {latestSubmission.version} ·{" "}
                    {latestSubmission.status.replace(/_/g, " ")}
                  </p>
                )}

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="submission-type"
                      className="block text-sm font-medium text-on-surface"
                    >
                      Submission type
                    </label>
                    <select
                      id="submission-type"
                      value={form.submissionType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          submissionType: event.target.value as SubmissionType,
                        }))
                      }
                      className="input-halo w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-all"
                    >
                      {SUBMISSION_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Title"
                    name="title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Checkout API implementation"
                  />

                  <Field
                    label="Summary"
                    value={form.summary}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, summary: value }))
                    }
                    placeholder="What you built and how it meets the acceptance criteria."
                    rows={3}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Repository URL"
                      name="repoUrl"
                      value={form.repoUrl}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          repoUrl: event.target.value,
                        }))
                      }
                      placeholder="https://github.com/nexus-ai/..."
                    />
                    <Input
                      label="Branch"
                      name="branchName"
                      value={form.branchName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          branchName: event.target.value,
                        }))
                      }
                      placeholder="feat/checkout-api"
                    />
                    <Input
                      label="Pull request URL"
                      name="pullRequestUrl"
                      value={form.pullRequestUrl}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          pullRequestUrl: event.target.value,
                        }))
                      }
                      placeholder="https://github.com/nexus-ai/.../pull/4"
                    />
                    <Input
                      label="Commit SHA"
                      name="commitSha"
                      value={form.commitSha}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          commitSha: event.target.value,
                        }))
                      }
                      placeholder="40-character commit SHA"
                    />
                  </div>

                  <Field
                    label="Notes"
                    value={form.notes}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, notes: value }))
                    }
                    placeholder="Anything the reviewer should know."
                  />

                  <Field
                    label="Screenshot URLs"
                    value={form.screenshots}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, screenshots: value }))
                    }
                    placeholder="One URL per line"
                    rows={3}
                  />

                  <Field
                    label="Attachment URLs"
                    value={form.attachments}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, attachments: value }))
                    }
                    placeholder="One URL per line"
                    rows={3}
                  />
                </div>

                {!submitState.allowed && (
                  <p className="mt-5 flex items-start gap-2 rounded-lg bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">
                    <Lock size={15} className="mt-0.5 shrink-0" aria-hidden />
                    <span>{submitState.reason}</span>
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveDraft}
                    loading={saving === "draft"}
                    disabled={saving !== null || !submitState.allowed}
                  >
                    <Save size={15} />
                    Save draft
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    loading={saving === "submit"}
                    disabled={saving !== null || !submitState.allowed}
                  >
                    <Send size={15} />
                    Submit for review
                  </Button>
                </div>
              </section>
            ) : latestSubmission ? (
              <SubmissionReceipt
                submission={latestSubmission}
                review={latestReview}
                onRevise={
                  latestSubmission.status === "rejected"
                    ? () => {
                        setForm(formFromSubmission(latestSubmission));
                        setStartNewVersion(true);
                      }
                    : undefined
                }
              />
            ) : null}
          </main>

          <aside className="space-y-4">
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
              <h3 className="font-headline text-base font-semibold text-on-surface">
                Your compensation
              </h3>
              <p className="mt-3 text-xl font-semibold text-on-surface">
                {task.budgetAmount != null && task.currency
                  ? new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: task.currency,
                    }).format(Number(task.budgetAmount))
                  : "Not allocated"}
              </p>
              <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                This task amount becomes approved earnings after admin approval.
              </p>
            </section>

            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
              <h3 className="font-headline text-base font-semibold text-on-surface">
                Dependencies
              </h3>
              {dependencies.length ? (
                <ul className="mt-4 space-y-3">
                  {dependencies.map((dependency) => (
                    <li
                      key={dependency.id}
                      className="flex items-start justify-between gap-2 text-sm"
                    >
                      <span className="min-w-0 text-on-surface">
                        {dependency.title}
                      </span>
                      <StatusBadge status={dependency.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-on-surface-variant">
                  {dependencyTaskIds(task.dependencies).length
                    ? "This task has dependencies that are not visible to your profile."
                    : "No dependencies."}
                </p>
              )}
            </section>

            {openRevisions.length > 0 && (
              <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
                <h3 className="font-headline text-base font-semibold text-on-surface">
                  Requested changes
                </h3>
                <ul className="mt-4 space-y-4">
                  {openRevisions.map((revision) => (
                    <li key={revision.id} className="text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 font-medium text-on-surface">
                          {revision.title}
                        </span>
                        <StatusBadge status={revision.status} />
                      </div>
                      {revision.description && (
                        <p className="mt-1 text-on-surface-variant">
                          {revision.description}
                        </p>
                      )}
                      {revision.dueAt && (
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Due {formatDate(revision.dueAt)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {latestSubmission && (
              <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
                <h3 className="font-headline text-base font-semibold text-on-surface">
                  Submitted evidence
                </h3>
                <EvidenceList className="mt-4" submission={latestSubmission} />
              </section>
            )}

            {latestEvaluation && (
              <FreelancerEvaluation run={latestEvaluation} />
            )}
          </aside>
        </div>
      )}
    </DashboardShell>
  );
}
