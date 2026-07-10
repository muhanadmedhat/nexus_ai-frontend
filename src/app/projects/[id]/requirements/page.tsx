"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeft, Send, Bot, CheckCircle2, Circle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getBrief, getBriefMessages, sendBriefMessage } from "@/services/brief";
import type { Brief, BriefMessage } from "@/types/project";

export default function RequirementsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const role = (user?.role || "customer") as "customer" | "freelancer" | "admin";

  const [messages, setMessages] = useState<BriefMessage[]>([]);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getBriefMessages(id), getBrief(id)]).then(([m, b]) => {
      setMessages(m);
      setBrief(b);
    });
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || sending || brief?.isComplete) return;
    setInput("");
    setSending(true);
    try {
      const { messages: next, brief: nextBrief } = await sendBriefMessage(id, text);
      setMessages(next);
      setBrief(nextBrief);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardShell
      role={role}
      title="Requirements agent"
      subtitle="Answer the agent's questions to build your project brief."
    >
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to project
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chat panel */}
        <div className="flex h-[600px] flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow lg:col-span-2">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((m) => {
              const isAgent = m.senderType === "agent";
              return (
                <div key={m.id} className={clsx("flex gap-3", !isAgent && "flex-row-reverse")}>
                  {isAgent && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container/15 text-primary-container">
                      <Bot size={16} />
                    </span>
                  )}
                  <div
                    className={clsx(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      isAgent
                        ? "bg-surface-container-high text-on-surface"
                        : "bg-primary-container text-on-primary",
                    )}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-outline-variant/30 p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSend()}
                disabled={brief?.isComplete}
                placeholder={brief?.isComplete ? "Brief complete" : "Type your answer…"}
                className="input-halo flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface outline-none transition-all placeholder:text-outline/50 disabled:opacity-60"
              />
              <Button
                onClick={onSend}
                loading={sending}
                disabled={brief?.isComplete || !input.trim()}
                className="inline-flex w-auto items-center px-4 py-2.5"
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Live brief summary */}
        <div className="space-y-4">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-headline text-base font-semibold text-on-surface">Brief progress</h3>
              <span className="text-sm font-semibold text-primary-container">
                {brief?.completionPercent ?? 0}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-container-high">
              <div
                className="h-1.5 rounded-full bg-primary-container transition-all"
                style={{ width: `${brief?.completionPercent ?? 0}%` }}
              />
            </div>
            {brief?.summary && (
              <p className="mt-3 text-sm text-on-surface-variant">{brief.summary}</p>
            )}
          </div>

          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow">
            <h3 className="mb-3 font-headline text-base font-semibold text-on-surface">
              Missing fields
            </h3>
            {brief && brief.missingFields.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-primary-container">
                <CheckCircle2 size={16} /> All requirements captured
              </p>
            ) : (
              <ul className="space-y-2">
                {brief?.missingFields.map((field) => (
                  <li key={field} className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <Circle size={14} className="text-outline" /> {field}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
