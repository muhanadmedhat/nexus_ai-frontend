"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Bell, Search, LogOut, User, Settings, HelpCircle } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { useAuth } from "@/hooks/use-auth";
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

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest px-4 md:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low md:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
        <div className="hidden md:block">
          <h1 className="font-headline text-xl font-semibold text-on-surface">{title}</h1>
          {subtitle && <p className="text-xs text-on-surface-variant">{subtitle}</p>}
        </div>
        <div className="block md:hidden">
          <Logo className="text-lg" />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search placeholder */}
        <div className="hidden items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-1.5 text-sm text-on-surface-variant lg:flex">
          <Search size={16} className="text-outline" />
          <span className="text-xs">Search...</span>
          <kbd className="ml-2 rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] text-on-surface-variant">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <button
          className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-container-low"
          >
            <span className="hidden text-sm text-on-surface sm:block">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-on-primary">
              {initials || "?"}
            </span>
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-1.5 shadow-lg">
                <div className="border-b border-outline-variant/30 px-4 py-2.5">
                  <p className="text-sm font-medium text-on-surface">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-on-surface-variant">{user?.email}</p>
                  <p className="mt-0.5 text-xs capitalize text-primary-container">
                    {user?.role}
                  </p>
                </div>
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