"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { clsx } from "clsx";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  Circle,
  CreditCard,
  Edit3,
  Loader2,
  RefreshCcw,
  Save,
  Send,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  confirmBrief,
  getBrief,
  getBriefMessages,
  reopenBriefAiHelp,
  sendBriefMessage,
  updateBrief,
} from "@/services/brief";
import { getProject } from "@/services/projects";
import type {
  Brief,
  BriefFieldValues,
  BriefMessage,
  Project,
  ProjectStatus,
} from "@/types/project";
import { useToast } from "@/components/ui/toast";

const BRIEF_FIELD_CONFIG: Array<{
  key: keyof BriefFieldValues;
  label: string;
  multiline?: boolean;
}> = [
  { key: "businessDomain", label: "Business domain" },
  { key: "mainGoal", label: "Main goal", multiline: true },
  { key: "targetUsers", label: "Target users", multiline: true },
  { key: "coreFeatures", label: "Core features", multiline: true },
  { key: "platforms", label: "Platforms" },
  { key: "solutionType", label: "Solution type" },
  {
    key: "scopeDetails",
    label: "Pages, screens and main user journey",
    multiline: true,
  },
  { key: "integrations", label: "External integrations", multiline: true },
  { key: "adminNeeds", label: "Admin dashboard needs", multiline: true },
  { key: "deliverables", label: "Deliverables", multiline: true },
  {
    key: "constraintsPreferences",
    label: "Constraints / preferences",
    multiline: true,
  },
  { key: "clientBackground", label: "Client background" },
  { key: "suggestedTeamSize", label: "Team size" },
  { key: "experienceLevel", label: "Experience level" },
  { key: "experienceMinYears", label: "Minimum years" },
];

const EMPTY_BRIEF_FIELDS: BriefFieldValues = {
  businessDomain: "",
  mainGoal: "",
  targetUsers: "",
  coreFeatures: "",
  platforms: "",
  solutionType: "",
  scopeDetails: "",
  integrations: "",
  adminNeeds: "",
  deliverables: "",
  constraintsPreferences: "",
  clientBackground: "",
  suggestedTeamSize: "",
  experienceLevel: "",
  experienceMinYears: "",
};

const BRIEF_CHANGE_LOCKED_STATUSES: ProjectStatus[] = [
  "assigned",
  "active",
  "under_review",
  "completed",
  "cancelled",
  "disputed",
];

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function RequirementsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState<BriefMessage[]>([]);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingBrief, setEditingBrief] = useState(false);
  const [savingBrief, setSavingBrief] = useState(false);
  const [formFields, setFormFields] =
    useState<BriefFieldValues>(EMPTY_BRIEF_FIELDS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const progress = brief?.completionPercent ?? 0;
  const missingFields = useMemo(() => brief?.missingFields ?? [], [brief]);
  const canChangeBrief = project
    ? !BRIEF_CHANGE_LOCKED_STATUSES.includes(project.status)
    : true;
  const chatLocked = Boolean(brief?.isComplete && !brief.aiRevisionOpen);

  useEffect(() => {
    if (!id || user?.role !== "customer") return;

    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setLoadError(null);
    });

    getProject(id)
      .then(async (nextProject) => {
        const nextBrief = await getBrief(id);
        const nextMessages = await getBriefMessages(id);
        return { nextProject, nextBrief, nextMessages };
      })
      .then(({ nextProject, nextMessages, nextBrief }) => {
        if (!active) return;
        setProject(nextProject);
        setMessages(nextMessages);
        setBrief(nextBrief);
        setFormFields(nextBrief.fields);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load requirements",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, user?.role]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || sending || chatLocked) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: BriefMessage = {
      id: optimisticId,
      briefId: brief?.id ?? id,
      senderType: "customer",
      message: text,
      createdAt: new Date().toISOString(),
    };

    setInput("");
    setMessages((current) => [...current, optimisticMessage]);
    setSending(true);

    try {
      const { messages: nextMessages, brief: nextBrief } =
        await sendBriefMessage(id, text);
      setMessages((current) => {
        const withoutOptimistic = current.filter(
          (message) => message.id !== optimisticId,
        );
        const existingIds = new Set(
          withoutOptimistic.map((message) => message.id),
        );
        const newMessages = nextMessages.filter(
          (message) => !existingIds.has(message.id),
        );

        return [...withoutOptimistic, ...newMessages];
      });
      setBrief(nextBrief);
      if (!editingBrief) setFormFields(nextBrief.fields);
    } catch (err) {
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticId),
      );
      setInput(text);
      toast.error(
        "Could not send message",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const onSaveBrief = async () => {
    if (!brief || savingBrief) return;

    setSavingBrief(true);

    try {
      const nextBrief = await updateBrief(id, formFields);
      setBrief(nextBrief);
      setFormFields(nextBrief.fields);
      setEditingBrief(false);
      toast.success("Brief updated");
    } catch (error) {
      toast.error(
        "Could not update brief",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSavingBrief(false);
    }
  };

  const onReopenAi = async () => {
    if (!brief || savingBrief || !canChangeBrief) return;

    setSavingBrief(true);

    try {
      const { brief: nextBrief, messages: nextMessages } =
        await reopenBriefAiHelp(id);
      setBrief(nextBrief);
      setMessages(nextMessages);
      setFormFields(nextBrief.fields);
      setEditingBrief(false);
      toast.success("AI help reopened", "You can send a focused revision now.");
    } catch (error) {
      toast.error(
        "Could not reopen AI help",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSavingBrief(false);
    }
  };

  const onConfirmBrief = async () => {
    if (!brief || savingBrief || !canChangeBrief) return;

    setSavingBrief(true);

    try {
      const nextBrief = await confirmBrief(id);
      setBrief(nextBrief);
      setFormFields(nextBrief.fields);
      setEditingBrief(false);
      toast.success(
        "Brief confirmed",
        "The final price is ready. Fund escrow to start matching.",
      );
    } catch (error) {
      toast.error(
        "Could not confirm brief",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSavingBrief(false);
    }
  };

  const updateField = (key: keyof BriefFieldValues, value: string) => {
    setFormFields((current) => ({ ...current, [key]: value }));
  };

  return (
    <DashboardShell
      role="customer"
      title="Requirements agent"
      subtitle="Answer the agent's questions to build your project brief."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft size={16} /> Back to project
          </Link>

          {brief?.isComplete && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container/10 px-3 py-1 text-xs font-semibold text-primary-container">
              <CheckCircle2 size={14} />
              {brief.confirmedAt ? "Brief confirmed" : "Brief complete"}
            </span>
          )}
        </div>

        {loadError && (
          <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
            <AlertCircle size={16} />
            {loadError}
          </div>
        )}

        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="flex h-[calc(100dvh-10rem)] min-h-[445px] max-h-[635px] min-w-0 flex-col overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-lowest card-shadow">
            <div className="shrink-0 border-b border-primary/20 bg-primary-container px-4 py-3 text-on-primary sm:px-5">
              <p className="text-xs font-medium uppercase tracking-wide text-on-primary/75">
                Requirements chat
              </p>
              <h2 className="min-w-0 truncate font-headline text-base font-semibold sm:text-lg">
                {project?.title ? `${project.title} brief` : "Project brief"}
              </h2>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4 md:p-6"
            >
              {loading ? (
                <div className="flex h-full min-h-[360px] items-center justify-center text-on-surface-variant">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : (
                messages.map((message) => {
                  const isAgent = message.senderType === "agent";
                  const time = formatMessageTime(message.createdAt);

                  return (
                    <div
                      key={message.id}
                      className={clsx(
                        "flex min-w-0 gap-2 sm:gap-3",
                        !isAgent && "flex-row-reverse",
                      )}
                    >
                      {isAgent && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container/10 text-primary-container sm:h-9 sm:w-9">
                          <Bot size={18} />
                        </span>
                      )}
                      <div
                        className={clsx(
                          "flex min-w-0 max-w-[86%] flex-col sm:max-w-[min(76ch,82%)]",
                          !isAgent && "items-end",
                        )}
                      >
                        <div
                          className={clsx(
                            "max-w-full whitespace-pre-wrap break-words rounded-lg px-3 py-2.5 text-sm leading-6 shadow-sm [overflow-wrap:anywhere] sm:px-4 sm:py-3",
                            isAgent
                              ? "bg-surface-container-high text-on-surface"
                              : "bg-primary-container text-on-primary",
                          )}
                        >
                          {message.message}
                        </div>
                        {time && (
                          <span className="mt-1 text-[11px] text-on-surface-variant">
                            {time}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {sending && (
                <div className="flex min-w-0 gap-2 sm:gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container/10 text-primary-container sm:h-9 sm:w-9">
                    <Bot size={18} />
                  </span>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">
                    <Loader2 size={16} className="animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-outline-variant/30 bg-surface-container-lowest p-3 md:p-4">
              <div className="grid grid-cols-[minmax(0,4fr)_minmax(3.75rem,1fr)] items-end gap-2 sm:gap-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      onSend();
                    }
                  }}
                  disabled={chatLocked || loading}
                  placeholder={
                    chatLocked
                      ? "Brief complete. Edit fields or reopen AI help."
                      : "Type your answer..."
                  }
                  rows={1}
                  className="input-halo min-h-12 max-h-32 min-w-0 resize-none overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 text-sm leading-6 text-on-surface outline-none transition-all placeholder:text-outline/60 disabled:opacity-60 sm:px-4"
                />
                <button
                  type="button"
                  onClick={onSend}
                  disabled={chatLocked || loading || sending || !input.trim()}
                  aria-label="Send answer"
                  title="Send answer"
                  className="flex h-12 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-primary-container px-2 text-on-primary shadow-sm transition-all hover:bg-primary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? (
                    <Loader2 size={18} className="shrink-0 animate-spin" />
                  ) : (
                    <Send size={18} className="shrink-0" />
                  )}
                  <span className="hidden truncate text-sm font-semibold sm:inline">
                    Send
                  </span>
                </button>
              </div>
              {chatLocked && (
                <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                  Chat is paused to avoid extra AI usage. You can edit the brief
                  directly or reopen AI help for a focused revision.
                </p>
              )}
            </div>
          </section>

          <aside className="min-w-0 space-y-4 xl:sticky xl:top-20 xl:self-start">
            <section className="min-w-0 rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-headline text-base font-semibold text-on-surface">
                  Brief progress
                </h3>
                <span className="text-sm font-semibold text-primary-container">
                  {progress}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-primary-container transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 break-words text-sm leading-6 text-on-surface-variant [overflow-wrap:anywhere]">
                {brief?.summary ||
                  "Share your answers naturally. The agent will guide the next useful detail."}
              </p>
            </section>

            <section className="min-w-0 rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow sm:p-5">
              <h3 className="mb-3 font-headline text-base font-semibold text-on-surface">
                Missing fields
              </h3>
              {brief && (brief.isComplete || missingFields.length === 0) ? (
                <p className="flex items-center gap-2 text-sm text-primary-container">
                  <CheckCircle2 size={16} /> All requirements captured
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {missingFields.map((field) => (
                    <li
                      key={field}
                      className="flex min-w-0 items-center gap-2 text-sm text-on-surface-variant"
                    >
                      <Circle size={14} className="text-outline" />
                      <span className="min-w-0 break-words">{field}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {brief?.isComplete && (
              <section className="min-w-0 rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4 card-shadow sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-headline text-base font-semibold text-on-surface">
                      Brief review
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                      AI revisions used: {brief.revisionCount}/
                      {brief.revisionLimit}
                    </p>
                  </div>
                  {editingBrief ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBrief(false);
                        setFormFields(brief.fields);
                      }}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface"
                      aria-label="Cancel editing"
                      title="Cancel editing"
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingBrief(true)}
                      disabled={!canChangeBrief}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Edit brief"
                      title="Edit brief"
                    >
                      <Edit3 size={16} />
                    </button>
                  )}
                </div>

                {!canChangeBrief && (
                  <p className="mb-3 rounded-lg border border-outline-variant/30 bg-surface-container-high px-3 py-2 text-xs leading-5 text-on-surface-variant">
                    This brief is locked because the project has moved past
                    assignment.
                  </p>
                )}

                {editingBrief ? (
                  <div className="space-y-3">
                    {BRIEF_FIELD_CONFIG.map((field) => (
                      <label key={field.key} className="block">
                        <span className="mb-1 block text-xs font-semibold text-on-surface-variant">
                          {field.label}
                        </span>
                        {field.multiline ? (
                          <textarea
                            value={formFields[field.key]}
                            onChange={(event) =>
                              updateField(field.key, event.target.value)
                            }
                            rows={3}
                            className="input-halo min-h-20 w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm leading-6 text-on-surface outline-none"
                          />
                        ) : (
                          <input
                            value={formFields[field.key]}
                            onChange={(event) =>
                              updateField(field.key, event.target.value)
                            }
                            className="input-halo h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none"
                          />
                        )}
                      </label>
                    ))}

                    <button
                      type="button"
                      onClick={onSaveBrief}
                      disabled={savingBrief}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-3 text-sm font-semibold text-on-primary hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingBrief ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save brief edits
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {BRIEF_FIELD_CONFIG.map((field) => {
                      const value = brief.fields[field.key];
                      if (!value) return null;

                      return (
                        <div key={field.key} className="min-w-0">
                          <p className="text-xs font-semibold text-on-surface-variant">
                            {field.label}
                          </p>
                          <p className="mt-1 break-words text-sm leading-6 text-on-surface [overflow-wrap:anywhere]">
                            {value}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!editingBrief && (
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={onConfirmBrief}
                      disabled={
                        savingBrief ||
                        !canChangeBrief ||
                        Boolean(brief.confirmedAt)
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-container px-3 text-sm font-semibold text-on-primary hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingBrief ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      {brief.confirmedAt ? "Brief confirmed" : "Confirm brief"}
                    </button>

                    {brief.confirmedAt && (
                      <Link
                        href={`/projects/${id}/payments`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary-container/40 bg-primary-container/10 px-3 text-sm font-semibold text-primary-container hover:bg-primary-container/15"
                      >
                        <CreditCard size={16} />
                        View final price and fund escrow
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={onReopenAi}
                      disabled={
                        savingBrief ||
                        !canChangeBrief ||
                        brief.aiRevisionOpen ||
                        !brief.canReopenAi
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 text-sm font-semibold text-on-surface hover:border-primary-container hover:text-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCcw size={16} />
                      {brief.aiRevisionOpen
                        ? "AI help open"
                        : brief.canReopenAi
                          ? "Reopen AI help"
                          : "AI revision limit reached"}
                    </button>
                  </div>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
