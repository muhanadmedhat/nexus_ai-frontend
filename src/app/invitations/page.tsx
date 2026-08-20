"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Loader2, MailCheck } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  getInvitations,
  respondToInvitation,
  type ProjectInvitation,
} from "@/services/invitations";

function remaining(expiresAt: string, now: number) {
  if (!now) return "Calculating…";
  const seconds = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - now) / 1000),
  );
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return seconds > 0 ? `${hours}h ${minutes}m ${rest}s` : "Expired";
}

export default function InvitationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    try {
      setItems(await getInvitations());
    } catch (error) {
      toast.error(
        "Could not load invitations",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      setNow(Date.now());
      void load();
    }, 0);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    const refresh = window.setInterval(() => void load(), 15_000);
    const live = () => void load();
    window.addEventListener("nexus:notification", live);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(refresh);
      window.clearTimeout(initial);
      window.removeEventListener("nexus:notification", live);
    };
  }, [load]);

  const pending = useMemo(
    () => items.filter((item) => item.status === "pending"),
    [items],
  );
  const history = useMemo(
    () => items.filter((item) => item.status !== "pending"),
    [items],
  );

  const respond = async (
    item: ProjectInvitation,
    decision: "accepted" | "declined",
  ) => {
    const reason =
      decision === "declined"
        ? (window.prompt("Optional reason for declining") ?? undefined)
        : undefined;
    setWorking(item.id);
    try {
      await respondToInvitation(item.id, decision, reason);
      toast.success(
        `Invitation ${decision}`,
        decision === "accepted"
          ? "The assignment is now active."
          : "The next eligible freelancer will be invited automatically.",
      );
      await load();
    } catch (error) {
      toast.error(
        "Could not respond",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setWorking(null);
    }
  };

  return (
    <DashboardShell
      role="freelancer"
      title="Invitations"
      subtitle="Project offers expire automatically after two hours."
    >
      {loading ? (
        <div className="flex justify-center py-20 text-on-surface-variant">
          <Loader2 className="mr-2 animate-spin" /> Loading invitations…
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              Awaiting your response
            </h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {pending.length === 0 && <Empty text="No pending invitations." />}
              {pending.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary-container">
                        {item.phase.replace("_", " ")} ·{" "}
                        {item.roleKey.replace(/_/g, " ")}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-on-surface">
                        {item.task?.title ??
                          item.project?.title ??
                          "Project invitation"}
                      </h3>
                      {item.task && (
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {item.project?.title}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.task?.budgetAmount && (
                    <p className="mt-4 text-sm font-semibold text-on-surface">
                      Your task allocation:{" "}
                      {Number(item.task.budgetAmount).toLocaleString()}{" "}
                      {item.task.currency}
                    </p>
                  )}
                  <p className="mt-3 flex items-center gap-2 text-sm text-on-surface-variant">
                    <Clock3 size={16} /> Respond in{" "}
                    {remaining(item.expiresAt, now)}
                  </p>
                  <div className="mt-5 flex gap-3">
                    <Button
                      loading={working === item.id}
                      onClick={() => void respond(item, "accepted")}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      disabled={working === item.id}
                      onClick={() => void respond(item, "declined")}
                    >
                      Decline
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section>
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              History
            </h2>
            <div className="mt-3 space-y-3">
              {history.length === 0 && (
                <Empty text="No resolved invitations yet." />
              )}
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4"
                >
                  <div>
                    <p className="font-medium text-on-surface">
                      {item.task?.title ?? item.project?.title}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {item.roleKey.replace(/_/g, " ")}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant">
      <MailCheck className="mx-auto mb-2 opacity-40" />
      {text}
    </div>
  );
}
