"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  Users,
  ClipboardCheck,
  Cpu,
  GitBranch,
  GitPullRequest,
  ListChecks,
  Gauge,
  Star,
  MailCheck,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/common/logo";
import type { UserRole } from "@/types/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  customer: [
    {
      label: "Dashboard",
      href: "/dashboard/customer",
      icon: <LayoutDashboard size={20} />,
    },
    { label: "Projects", href: "/projects", icon: <FolderOpen size={20} /> },
    { label: "Tasks", href: "/tasks", icon: <CheckSquare size={20} /> },
    { label: "Messages", href: "/messages", icon: <MessageSquare size={20} /> },
    { label: "Payments", href: "/payments", icon: <CreditCard size={20} /> },
  ],
  freelancer: [
    {
      label: "Dashboard",
      href: "/dashboard/freelancer",
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: "Verification",
      href: "/freelancer/verification",
      icon: <ShieldCheck size={20} />,
    },
    {
      label: "Invitations",
      href: "/invitations",
      icon: <MailCheck size={20} />,
    },
    { label: "Reviewer", href: "/reviewer", icon: <UserCheck size={20} /> },
    {
      label: "Projects",
      href: "/freelancer/projects",
      icon: <FolderOpen size={20} />,
    },
    { label: "Tasks", href: "/tasks", icon: <CheckSquare size={20} /> },
    { label: "Messages", href: "/messages", icon: <MessageSquare size={20} /> },
    {
      label: "Payments",
      href: "/freelancer/payments",
      icon: <CreditCard size={20} />,
    },
  ],
  admin: [
    {
      label: "Dashboard",
      href: "/dashboard/admin",
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: "Projects",
      href: "/dashboard/admin/projects",
      icon: <FolderOpen size={20} />,
    },
    {
      label: "Submissions",
      href: "/dashboard/admin/planning/submissions",
      icon: <ClipboardCheck size={20} />,
    },
    {
      label: "Scrum Plans",
      href: "/dashboard/admin/project-plans",
      icon: <CheckSquare size={20} />,
    },
    {
      label: "Delivery",
      href: "/dashboard/admin/delivery",
      icon: <ListChecks size={20} />,
    },
    {
      label: "Task Matching",
      href: "/dashboard/admin/implementation-matching",
      icon: <GitPullRequest size={20} />,
    },
    {
      label: "Repositories",
      href: "/dashboard/admin/repositories",
      icon: <GitBranch size={20} />,
    },
    {
      label: "Evaluations",
      href: "/dashboard/admin/evaluations",
      icon: <Gauge size={20} />,
    },
    {
      label: "Escrow",
      href: "/dashboard/admin/payments",
      icon: <CreditCard size={20} />,
    },
    {
      label: "Revenue",
      href: "/dashboard/admin/revenue",
      icon: <Gauge size={20} />,
    },
    {
      label: "Releases",
      href: "/dashboard/admin/payment-release-requests",
      icon: <CreditCard size={20} />,
    },
    {
      label: "Freelancers",
      href: "/dashboard/admin/freelancers",
      icon: <ShieldCheck size={20} />,
    },
    {
      label: "Assessments",
      href: "/dashboard/admin/assessments",
      icon: <ClipboardCheck size={20} />,
    },
    {
      label: "Agents",
      href: "/dashboard/admin/agents",
      icon: <Cpu size={20} />,
    },
    {
      label: "Agent Jobs",
      href: "/dashboard/admin/agent-jobs",
      icon: <ListChecks size={20} />,
    },
    {
      label: "Reviews",
      href: "/dashboard/admin/reviews",
      icon: <Star size={20} />,
    },
    {
      label: "Users",
      href: "/dashboard/admin/users",
      icon: <Users size={20} />,
    },
  ],
};

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || "customer";
  const navItems = NAV_ITEMS[role as UserRole] || NAV_ITEMS.customer;

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col border-r border-outline-variant/30 bg-surface-container-lowest transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-outline-variant/30 px-6">
          <Logo className="text-xl" />
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isDashboardHome =
              item.href === "/dashboard/customer" ||
              item.href === "/dashboard/freelancer" ||
              item.href === "/dashboard/admin";
            const isActive = isDashboardHome
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                )}
              >
                <span
                  className={clsx(
                    isActive ? "text-on-primary-container" : "text-outline",
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile area */}
        <div className="mt-auto border-t border-outline-variant/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary-container text-sm font-semibold text-on-primary">
              {user?.photoUrl ? (
                <span
                  aria-hidden="true"
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${user.photoUrl})` }}
                />
              ) : (
                <>
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-on-surface">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs capitalize text-on-surface-variant">
                {role}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
