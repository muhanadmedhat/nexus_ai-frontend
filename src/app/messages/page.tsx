"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Inbox,
  MessageSquareWarning,
  RefreshCw,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type Notification,
} from "@/services/notifications";

const MESSAGE_POLL_MS = 5_000;

function messageHref(
  notification: Notification,
  role: "customer" | "freelancer" | "admin",
) {
  if (notification.actionUrl) return notification.actionUrl;
  if (!notification.projectId) return null;
  if (role === "freelancer" && notification.taskId) {
    return `/freelancer/projects/${notification.projectId}/tasks/${notification.taskId}`;
  }
  if (role === "admin") {
    return `/dashboard/admin/projects/${notification.projectId}/delivery`;
  }
  if (role === "customer") return `/projects/${notification.projectId}/work`;
  return null;
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const role = user?.role ?? "customer";
  const inFlightRef = useRef(false);
  const [messages, setMessages] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (showLoading = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (showLoading) setLoading(true);
    try {
      const result = await getNotifications({ limit: 100 });
      setMessages(result.data);
      setUnreadCount(result.unreadCount);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your activity.",
      );
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void refresh(true);
    }, 0);
    const interval = window.setInterval(() => {
      void refresh();
    }, MESSAGE_POLL_MS);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("nexus:notification", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("nexus:notification", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  const markRead = async (message: Notification) => {
    if (message.isRead) return;
    setMessages((current) =>
      current.map((item) =>
        item.id === message.id
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await markNotificationAsRead(message.id);
    } catch {
      void refresh();
    }
  };

  const markAllRead = async () => {
    const previous = messages;
    const previousUnread = unreadCount;
    setMessages((current) =>
      current.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsAsRead();
    } catch (markError) {
      setMessages(previous);
      setUnreadCount(previousUnread);
      setError(
        markError instanceof Error
          ? markError.message
          : "Could not mark activity as read.",
      );
    }
  };

  return (
    <DashboardShell
      role={role}
      title="Activity"
      subtitle="Every invitation, decision, staffing update, revision request, and recovery action remains available here."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant" aria-live="polite">
          {unreadCount > 0
            ? `${unreadCount} unread ${unreadCount === 1 ? "update" : "updates"}`
            : "You are all caught up."}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refresh(true)}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllRead}>
              <CheckCheck size={15} />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error"
        >
          <MessageSquareWarning size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && messages.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
          <RefreshCw
            size={30}
            className="mx-auto animate-spin text-primary-container"
          />
          <p className="mt-3 text-sm text-on-surface-variant">
            Loading activity...
          </p>
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center card-shadow">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
            <Inbox size={32} className="text-outline" />
          </div>
          <h3 className="text-lg font-semibold text-on-surface">
            No activity yet
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Invitations, project decisions, and workflow updates will appear
            here.
          </p>
        </div>
      ) : (
        <ol className="space-y-3" aria-live="polite">
          {messages.map((message) => {
            const href = messageHref(message, role);
            const content = (
              <article className="flex items-start gap-4">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    message.isRead
                      ? "bg-surface-container-high text-on-surface-variant"
                      : "bg-primary-container/10 text-primary-container"
                  }`}
                >
                  <Bell size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-on-surface">
                      {message.title}
                    </h3>
                    <span className="text-xs text-on-surface-variant">
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                  {message.body && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
                      {message.body}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    {!message.isRead && (
                      <span className="font-semibold text-primary-container">
                        New
                      </span>
                    )}
                    {href && (
                      <span className="text-on-surface-variant">
                        Open related work →
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );

            return (
              <li key={message.id}>
                {href ? (
                  <Link
                    href={href}
                    onClick={() => void markRead(message)}
                    className={`block rounded-xl border p-5 card-shadow transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      message.isRead
                        ? "border-outline-variant/30 bg-surface-container-lowest"
                        : "border-primary-container/35 bg-primary-container/5"
                    }`}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => void markRead(message)}
                    className={`block w-full rounded-xl border p-5 text-left card-shadow transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      message.isRead
                        ? "border-outline-variant/30 bg-surface-container-lowest"
                        : "border-primary-container/35 bg-primary-container/5"
                    }`}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </DashboardShell>
  );
}
