"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckSquare, Link2, Upload } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  createPlanningSubmission,
  getProjectSubmissions,
  getPlanningRequirements,
  getSubmissionDetail,
  uploadPlanningArtifact,
  type PlanningSubmission,
  type PlanningRequirement,
  type PlanningRequirementEvidence,
} from "@/services/planning";
import {
  getFreelancerProjectAssignment,
  type RoleAssignment,
} from "@/services/matching";

type SubmissionType = "architecture" | "ui_ux";

function submissionTypeForRole(roleKey: string): SubmissionType {
  return roleKey === "ui_ux" ? "ui_ux" : "architecture";
}

export default function FreelancerPlanningSubmission() {
  const { projectId } = useParams<{ projectId: string }>();
  const [assignment, setAssignment] = useState<RoleAssignment | null>(null);
  const [submissionType, setSubmissionType] = useState<SubmissionType>("architecture");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [requirements, setRequirements] = useState<PlanningRequirement[]>([]);
  const [requirementEvidence, setRequirementEvidence] = useState<Record<string, PlanningRequirementEvidence>>({});
  const [architectureApproved, setArchitectureApproved] = useState(false);
  const [previousSubmission, setPreviousSubmission] = useState<PlanningSubmission | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [loadingRequirements, setLoadingRequirements] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingArtifact, setUploadingArtifact] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!projectId) return;
    getFreelancerProjectAssignment(projectId)
      .then((result) => {
        const assignments = result.assignments;
        const current = assignments.find((item) => ["accepted", "in_progress", "completed", "assigned"].includes(item.status)) ?? assignments[0] ?? null;
        setAssignment(current);
        if (current?.roleKey) {
          const nextType = submissionTypeForRole(current.roleKey);
          setSubmissionType(nextType);
          setTitle(nextType === "architecture" ? "System architecture proposal" : "UI/UX design proposal");
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Could not load your assignment";
        toast.error("Assignment unavailable", message);
      })
      .finally(() => setLoadingAssignment(false));
  }, [projectId, toast]);

  useEffect(() => {
    if (!projectId || !assignment) return;
    getPlanningRequirements(projectId, submissionType)
      .then((result) => {
        setRequirements(result.requirements);
        setArchitectureApproved(result.architectureApproved);
        setRequirementEvidence((current) => {
          const next: Record<string, PlanningRequirementEvidence> = {};
          for (const requirement of result.requirements) {
            next[requirement.key] = current[requirement.key] ?? { summary: "", urls: [] };
          }
          return next;
        });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Could not load the quality checklist";
        toast.error("Checklist unavailable", message);
      })
      .finally(() => setLoadingRequirements(false));
  }, [assignment, projectId, submissionType, toast]);

  useEffect(() => {
    if (!projectId || !assignment) return;
    let cancelled = false;
    getProjectSubmissions(projectId, { submissionType, limit: 1 })
      .then(async (items) => {
        const latest = items[0];
        if (!latest) {
          if (!cancelled) setPreviousSubmission(null);
          return;
        }
        const detail = await getSubmissionDetail(latest.id);
        if (cancelled) return;
        setPreviousSubmission(detail);
        setTitle(detail.title || (submissionType === "architecture" ? "System architecture proposal" : "UI/UX design proposal"));
        setSummary(detail.summary || "");
        const priorEvidence = (detail.content?.requirementEvidence ?? {}) as Record<string, PlanningRequirementEvidence>;
        setRequirementEvidence((current) => ({ ...current, ...priorEvidence }));
      })
      .catch(() => {
        if (!cancelled) setPreviousSubmission(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assignment, projectId, submissionType]);

  function updateEvidence(key: string, update: Partial<PlanningRequirementEvidence>) {
    setRequirementEvidence((current) => ({
      ...current,
      [key]: { ...(current[key] ?? { summary: "", urls: [] }), ...update },
    }));
  }

  async function handleArtifactUpload(key: string, file: File) {
    if (!projectId) return;
    setUploadingArtifact(key);
    try {
      const uploaded = await uploadPlanningArtifact(projectId, file);
      setRequirementEvidence((current) => {
        const evidence = current[key] ?? { summary: "", urls: [] };
        return {
          ...current,
          [key]: {
            ...evidence,
            urls: Array.from(new Set([...evidence.urls, uploaded.url])),
          },
        };
      });
      toast.success("Artifact uploaded", `${uploaded.originalName} is stored as an immutable evaluation artifact.`);
    } catch (error) {
      toast.error("Artifact upload failed", error instanceof Error ? error.message : "Could not upload the artifact");
    } finally {
      setUploadingArtifact(null);
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId || !assignment) {
      toast.error("No assignment found", "Accept the planning assignment before submitting a deliverable.");
      return;
    }
    const incomplete = requirements.filter((requirement) => {
      const evidence = requirementEvidence[requirement.key];
      return requirement.mandatory &&
        (!evidence?.summary.trim() || (requirement.requiresUrl && !evidence.urls.length));
    });
    if (incomplete.length) {
      toast.error(
        "Complete the mandatory checklist",
        `Add evidence for: ${incomplete.slice(0, 3).map((item) => item.title).join(", ")}${incomplete.length > 3 ? ` and ${incomplete.length - 3} more` : ""}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const allUrls = Array.from(
        new Set(Object.values(requirementEvidence).flatMap((evidence) => evidence.urls))
      );
      await createPlanningSubmission(projectId, {
        assignmentId: assignment.id,
        submissionType,
        title,
        summary,
        content: {
          summary,
          submittedByRole: assignment.roleKey,
          deliverableType: submissionType,
          requirementEvidence,
        },
        fileUrls: { evidence: allUrls },
        status: "submitted"
      });
      toast.success(
        "Submission sent for AI evaluation",
        submissionType === "ui_ux" && !architectureApproved
          ? "Your evidence is saved. Evaluation starts after architecture is approved."
          : "The quality gate is checking every mandatory requirement before admin review."
      );
      router.push(`/freelancer/projects/${projectId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit deliverable";
      toast.error("Submission failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell role="freelancer" title="Planning Submission" subtitle="Submit your architecture or UI/UX deliverable.">
      <Link href={`/freelancer/projects/${projectId}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary">
        <ArrowLeft size={16} /> Back to assignment
      </Link>

      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow max-w-2xl">
        {loadingAssignment ? (
          <p className="text-sm text-on-surface-variant">Loading assignment...</p>
        ) : !assignment ? (
          <p className="text-sm text-on-surface-variant">No active planning assignment was found for this project.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Deliverable Type</label>
              <select value={submissionType} disabled className="w-full rounded-md border border-outline-variant p-2.5 bg-surface disabled:cursor-not-allowed disabled:opacity-70">
                <option value="architecture">Architecture</option>
                <option value="ui_ux">UI/UX Design</option>
              </select>
              <p className="mt-1 text-xs text-on-surface-variant">Assignment: {assignment.roleKey.replace("_", " ")}</p>
            </div>
            {assignment.roleBrief?.summary ? (
              <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                  Role brief
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {assignment.roleBrief.summary}
                </p>
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Title</label>
              <input required value={title} onChange={(event) => setTitle(event.target.value)} type="text" className="w-full rounded-md border border-outline-variant p-2.5 bg-surface" placeholder="e.g. System Architecture v1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Summary</label>
              <textarea required value={summary} onChange={(event) => setSummary(event.target.value)} className="w-full rounded-md border border-outline-variant p-2.5 min-h-[120px] bg-surface" placeholder="Describe your architecture/design decisions, assumptions, and recommended next steps." />
            </div>

            <section className="space-y-3 border-t border-outline-variant/30 pt-5">
              <div className="flex items-start gap-3">
                <CheckSquare className="mt-0.5 text-primary" size={20} />
                <div>
                  <h2 className="font-headline text-lg font-semibold text-on-surface">Mandatory AI quality checklist</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Explain where each item is covered. The AI returns specific revisions for anything incomplete or inconsistent; an admin makes the final approval.
                  </p>
                </div>
              </div>
              {submissionType === "ui_ux" && !architectureApproved ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-on-surface">
                  You may submit now, but UI/UX evaluation waits for the architecture contract to be approved so endpoints, fields, roles, and states can be cross-checked.
                </div>
              ) : null}
              {previousSubmission?.evaluationResult ? (
                <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
                  <p className="text-sm font-semibold text-on-surface">Previous verdict · version {previousSubmission.version}</p>
                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">The new evaluation preserves this issue history and only closes an issue when the submitted artifact proves it was fixed.</p>
                  {previousSubmission.evaluationResult.openIssues?.length ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-error">
                      {previousSubmission.evaluationResult.openIssues.map((issue) => <li key={issue.id}>{issue.message}</li>)}
                    </ul>
                  ) : <p className="mt-2 text-sm text-on-surface-variant">No open issues in the previous verdict.</p>}
                </div>
              ) : null}
              {loadingRequirements ? (
                <p className="text-sm text-on-surface-variant">Loading project-specific requirements...</p>
              ) : (
                <div className="space-y-3">
                  {requirements.map((requirement, index) => {
                    const evidence = requirementEvidence[requirement.key] ?? { summary: "", urls: [] };
                    return (
                      <div key={requirement.key} className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
                        <div className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                          <div>
                            <h3 className="text-sm font-semibold text-on-surface">{requirement.title} {requirement.mandatory ? <span className="text-error">*</span> : null}</h3>
                            <p className="mt-1 text-xs leading-5 text-on-surface-variant">{requirement.description}</p>
                          </div>
                        </div>
                        <label className="mt-3 block text-xs font-medium text-on-surface" htmlFor={`${requirement.key}-summary`}>Evidence and implementation details</label>
                        <textarea
                          id={`${requirement.key}-summary`}
                          required={requirement.mandatory}
                          value={evidence.summary}
                          onChange={(event) => updateEvidence(requirement.key, { summary: event.target.value })}
                          rows={3}
                          className="mt-1 w-full rounded-md border border-outline-variant bg-surface p-2.5 text-sm"
                          placeholder="Give project-specific decisions, coverage, states, contracts, and handoff details."
                        />
                        <label className="mt-3 flex items-center gap-1 text-xs font-medium text-on-surface" htmlFor={`${requirement.key}-urls`}>
                          <Link2 size={13} /> Evidence URLs {requirement.requiresUrl ? <span className="text-error">*</span> : <span className="font-normal text-on-surface-variant">(optional)</span>}
                        </label>
                        <textarea
                          id={`${requirement.key}-urls`}
                          required={requirement.requiresUrl}
                          value={evidence.urls.join("\n")}
                          onChange={(event) => updateEvidence(requirement.key, {
                            urls: event.target.value.split(/\n+/).map((url) => url.trim()).filter(Boolean),
                          })}
                          rows={requirement.requiresUrl ? 2 : 1}
                          className="mt-1 w-full rounded-md border border-outline-variant bg-surface p-2.5 text-sm"
                          placeholder="One accessible Figma, diagram, contract, document, or repository URL per line"
                        />
                        <label className="mt-3 block text-xs font-medium text-on-surface" htmlFor={`${requirement.key}-file`}>Upload immutable artifact <span className="font-normal text-on-surface-variant">(PDF, JSON, YAML, text, PNG, JPEG or WebP; 25 MB max)</span></label>
                        <input
                          id={`${requirement.key}-file`}
                          type="file"
                          accept=".pdf,.json,.yaml,.yml,.txt,.md,.png,.jpg,.jpeg,.webp,application/pdf,application/json,image/png,image/jpeg,image/webp,text/plain,text/markdown,text/yaml"
                          disabled={uploadingArtifact !== null}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handleArtifactUpload(requirement.key, file);
                            event.target.value = "";
                          }}
                          className="mt-1 block w-full text-xs text-on-surface-variant file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-medium file:text-primary"
                        />
                        {uploadingArtifact === requirement.key ? <p className="mt-1 text-xs text-primary">Uploading and hashing artifact…</p> : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            <Button type="submit" loading={submitting} disabled={loadingRequirements || !requirements.length || uploadingArtifact !== null} className="w-full mt-4"><Upload size={16} className="mr-2" /> Submit for AI evaluation</Button>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
