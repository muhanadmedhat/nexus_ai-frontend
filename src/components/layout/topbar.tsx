"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Bell, Search, LogOut, User, Settings, HelpCircle, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listNotifications } from "@/services/notifications";
import type { Notification } from "@/types/project";
import { clsx } from "clsx";

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export function Topbar({ title, subtitle, onMenuClick }: TopbarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let active = true;

    listNotifications()
      .then((items) => {
        if (active) setNotifications(items);
      })
      .catch(() => {
        if (active) setNotifications([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const unread = notifications.filter((n) => !n.isRead).length;

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest px-3 sm:px-4 md:px-6">
      {/* Left side */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low md:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
        <div className="hidden min-w-0 md:block">
          <h1 className="font-headline text-xl font-semibold text-on-surface">{title}</h1>
          {subtitle && <p className="text-xs text-on-surface-variant">{subtitle}</p>}
        </div>
        <div className="min-w-0 md:hidden">
          <p className="truncate font-headline text-base font-semibold text-on-surface">{title}</p>
          {subtitle && <p className="max-w-[42vw] truncate text-[11px] text-on-surface-variant">{subtitle}</p>}
        </div>
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Search placeholder */}
        <div className="hidden items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-1.5 text-sm text-on-surface-variant lg:flex">
          <Search size={16} className="text-outline" />
          <span className="text-xs">Search...</span>
          <kbd className="ml-2 rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] text-on-surface-variant">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen((v) => !v)}
            className="relative rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-container px-1 text-[10px] font-semibold text-on-primary">
                {unread}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-1.5rem),20rem)] rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-1.5 shadow-lg">
                <div className="border-b border-outline-variant/30 px-4 py-2.5">
                  <p className="text-sm font-semibold text-on-surface">Notifications</p>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-on-surface-variant">
                    You&apos;re all caught up.
                  </p>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={clsx(
                          "border-b border-outline-variant/20 px-4 py-3 last:border-0",
                          !n.isRead && "bg-primary-container/[0.04]",
                        )}
                      >
                        <p className="text-sm font-medium text-on-surface">{n.title}</p>
                        {n.body && (
                          <p className="mt-0.5 text-xs text-on-surface-variant">{n.body}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen((v) => !v)}
            className="flex items-center gap-1 rounded-lg px-1.5 py-1.5 hover:bg-surface-container-low"
            aria-label="Account menu"
          >
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-container text-sm font-semibold text-on-primary">
              {user?.photoUrl ? (
                <span
                  aria-hidden="true"
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${user.photoUrl})` }}
                />
              ) : (
                initials || "?"
              )}
            </span>
            <ChevronDown size={14} className="hidden text-outline sm:block" />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-1.5 shadow-lg">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    router.push("/profile");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low"
                >
                  <User size={16} className="text-outline" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low"
                >
                  <Settings size={16} className="text-outline" />
                  Settings
                </button>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low"
                >
                  <HelpCircle size={16} className="text-outline" />
                  Help
                </button>
                <div className="border-t border-outline-variant/30" />
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-error hover:bg-surface-container-low"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
