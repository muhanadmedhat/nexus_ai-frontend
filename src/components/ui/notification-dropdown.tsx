"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { clsx } from "clsx";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification,
} from "@/services/notifications";

const NOTIFICATION_CACHE_MS = 30_000;

export function NotificationDropdown() {
  const lastLoadedAtRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (force = false) => {
    if (!force && Date.now() - lastLoadedAtRef.current < NOTIFICATION_CACHE_MS) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, unreadCount } = await getNotifications();
      setNotifications(data);
      setUnreadCount(unreadCount);
      lastLoadedAtRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const loadTimer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [isOpen, loadNotifications]);

  const handleMarkRead = async (id: string) => {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    setNotifications((items) =>
      items.map((item) =>
        item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await markNotificationAsRead(id);
    } catch (err) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      console.error("Failed to mark as read", err);
    }
  };

  const handleMarkAllRead = async () => {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    setNotifications((items) =>
      items.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })),
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
    } catch (err) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      console.error("Failed to mark all as read", err);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "assessment_approved":
        return <Check className="h-4 w-4 text-green-500" />;
      case "assessment_rejected":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest px-4 py-3">
              <h3 className="font-semibold text-on-surface">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary-container hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-container border-t-transparent" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center py-8 px-4 text-center">
                <Bell className="h-8 w-8 text-error opacity-50" />
                <p className="mt-2 text-sm text-error">{error}</p>
                <button
                  onClick={() => void loadNotifications(true)}
                  className="mt-2 text-xs text-primary-container hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-on-surface-variant">
                <Bell size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/30">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={clsx(
                      "px-4 py-3 transition-colors hover:bg-surface-container-low",
                      !n.isRead && "bg-primary-container/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {getTypeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface">
                          {n.title}
                        </p>
                        <p className="text-xs text-on-surface-variant line-clamp-2">
                          {n.body}
                        </p>
                        <p className="mt-1 text-[10px] text-on-surface-variant/60">
                          {formatTime(n.createdAt)}
                        </p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(n.id);
                          }}
                          className="flex-shrink-0 text-xs text-primary-container hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
