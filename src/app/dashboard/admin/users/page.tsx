"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  getAdminUsers,
  updateAdminUser,
  type AdminUser,
} from "@/services/admin";
import { useToast } from "@/components/ui/toast";
import { useActionDialog } from "@/components/ui/action-dialog";
import {
  CheckCircle,
  Loader2,
  RotateCcw,
  Save,
  Search,
  ShieldOff,
  SlidersHorizontal,
  X,
} from "lucide-react";

type UserDraft = Pick<
  AdminUser,
  | "firstName"
  | "lastName"
  | "email"
  | "phoneNumber"
  | "role"
  | "isEmailVerified"
  | "isIdVerified"
>;

const roleLabels: Record<AdminUser["role"], string> = {
  admin: "Admin",
  customer: "Client",
  freelancer: "Freelancer",
};

const statusTabs = [
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
  { value: "email_pending", label: "Email pending" },
  { value: "", label: "All" },
];

function toDraft(user: AdminUser): UserDraft {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isIdVerified: user.isIdVerified,
  };
}

export default function AdminUsersPage() {
  const toast = useToast();
  const actionDialog = useActionDialog();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("active");
  const [role, setRole] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const limit = 20;

  const totalPages = Math.ceil(total / limit);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminUsers({
        page,
        limit,
        status: status || undefined,
        role: role || undefined,
        search: search || undefined,
      });
      setUsers(result.data);
      setTotal(result.total);
      setDrafts((current) => {
        const next = { ...current };
        for (const user of result.data) {
          next[user.id] = next[user.id] ?? toDraft(user);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [page, role, search, status]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadUsers]);

  const updateDraft = (id: string, values: Partial<UserDraft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...values },
    }));
  };

  const handleSave = async (user: AdminUser) => {
    const draft = drafts[user.id];
    if (!draft) return;

    setSaving(user.id);
    setError(null);
    try {
      await updateAdminUser(user.id, draft);
      toast.success("User updated", `${draft.firstName} ${draft.lastName} was saved.`);
      setEditingId(null);
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update user";
      setError(message);
      toast.error("Update failed", message);
    } finally {
      setSaving(null);
    }
  };

  const handleDisabledChange = async (user: AdminUser, disabled: boolean) => {
    const confirmed = await actionDialog.confirm({
      title: disabled ? "Disable this account?" : "Restore this account?",
      description: disabled
        ? `${user.email} will be signed out and unable to sign in until an administrator restores the account.`
        : `${user.email} will be able to sign in and use the platform again.`,
      confirmLabel: disabled ? "Disable account" : "Restore account",
      danger: disabled,
    });
    if (!confirmed) return;

    setSaving(user.id);
    setError(null);
    try {
      await updateAdminUser(user.id, { disabled });
      toast.success(
        disabled ? "Account disabled" : "Account restored",
        disabled
          ? `${user.email} can no longer refresh their session.`
          : `${user.email} is active again.`,
      );
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update user";
      setError(message);
      toast.error("Action failed", message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <DashboardShell
      role="admin"
      title="Users"
      subtitle="Manage accounts, roles, verification flags, and access."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={
              status === tab.value
                ? "rounded-full bg-primary-container px-4 py-1.5 text-sm font-medium text-on-primary"
                : "rounded-full bg-surface-container-low px-4 py-1.5 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container-high"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearch(searchInput.trim());
                setPage(1);
              }
            }}
            placeholder="Search name, email, or phone..."
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 text-sm text-on-surface outline-none focus:border-primary-container"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSearch(searchInput.trim());
            setPage(1);
          }}
          className="!w-auto px-3 py-2 text-sm"
        >
          <Search size={16} />
          Search
        </Button>
        <div className="relative">
          <SlidersHorizontal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-8 text-sm text-on-surface outline-none focus:border-primary-container"
          >
            <option value="">All roles</option>
            <option value="customer">Clients</option>
            <option value="freelancer">Freelancers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        {(search || role) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSearchInput("");
              setRole("");
              setPage(1);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low"
          >
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-container" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-6 text-center text-error">
          {error}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center text-on-surface-variant">
          No users match your filters.
        </div>
      ) : (
        <>
          <div className="admin-responsive-table-wrap rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
            <table className="admin-responsive-table text-left text-sm">
              <thead className="bg-surface-container-high">
                <tr>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">User</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Role</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Verification</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Joined</th>
                  <th className="px-4 py-3 text-right font-medium text-on-surface-variant">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const disabled = Boolean(user.deletedAt);
                  const draft = drafts[user.id] ?? toDraft(user);
                  const editing = editingId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-t border-outline-variant/20 align-top hover:bg-surface-container-low"
                    >
                      <td data-label="User" className="px-4 py-3">
                        {editing ? (
                          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                            <input
                              value={draft.firstName}
                              onChange={(event) =>
                                updateDraft(user.id, { firstName: event.target.value })
                              }
                              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary-container"
                              placeholder="First name"
                            />
                            <input
                              value={draft.lastName}
                              onChange={(event) =>
                                updateDraft(user.id, { lastName: event.target.value })
                              }
                              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary-container"
                              placeholder="Last name"
                            />
                            <input
                              value={draft.email}
                              onChange={(event) =>
                                updateDraft(user.id, { email: event.target.value })
                              }
                              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary-container sm:col-span-2"
                              placeholder="Email"
                            />
                            <input
                              value={draft.phoneNumber ?? ""}
                              onChange={(event) =>
                                updateDraft(user.id, {
                                  phoneNumber: event.target.value || null,
                                })
                              }
                              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary-container sm:col-span-2"
                              placeholder="Phone number"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-on-surface">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-on-surface-variant">{user.email}</p>
                            <p className="text-xs text-on-surface-variant">
                              {user.phoneNumber || "No phone"}
                            </p>
                          </div>
                        )}
                      </td>
                      <td data-label="Role" className="px-4 py-3">
                        {editing ? (
                          <select
                            value={draft.role}
                            onChange={(event) =>
                              updateDraft(user.id, {
                                role: event.target.value as AdminUser["role"],
                              })
                            }
                            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary-container"
                          >
                            <option value="customer">Client</option>
                            <option value="freelancer">Freelancer</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="rounded-full bg-primary-container/10 px-2.5 py-1 text-xs font-semibold text-primary-container">
                            {roleLabels[user.role]}
                          </span>
                        )}
                      </td>
                      <td data-label="Verification" className="px-4 py-3">
                        {editing ? (
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs text-on-surface">
                              <input
                                type="checkbox"
                                checked={draft.isEmailVerified}
                                onChange={(event) =>
                                  updateDraft(user.id, {
                                    isEmailVerified: event.target.checked,
                                  })
                                }
                              />
                              Email verified
                            </label>
                            <label className="flex items-center gap-2 text-xs text-on-surface">
                              <input
                                type="checkbox"
                                checked={draft.isIdVerified}
                                onChange={(event) =>
                                  updateDraft(user.id, {
                                    isIdVerified: event.target.checked,
                                  })
                                }
                              />
                              ID verified
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs">
                            <p className={user.isEmailVerified ? "text-primary-container" : "text-error"}>
                              Email: {user.isEmailVerified ? "Verified" : "Pending"}
                            </p>
                            <p className={user.isIdVerified ? "text-primary-container" : "text-on-surface-variant"}>
                              ID: {user.isIdVerified ? "Verified" : "Not verified"}
                            </p>
                          </div>
                        )}
                      </td>
                      <td data-label="Status" className="px-4 py-3">
                        <span
                          className={
                            disabled
                              ? "rounded-full border border-error/20 bg-error-container/40 px-2.5 py-1 text-xs font-semibold text-error"
                              : "rounded-full border border-primary-container/20 bg-primary-container/10 px-2.5 py-1 text-xs font-semibold text-primary-container"
                          }
                        >
                          {disabled ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td data-label="Joined" className="px-4 py-3 text-xs text-on-surface-variant">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td data-label="Actions" className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {editing ? (
                            <>
                              <Button
                                type="button"
                                loading={saving === user.id}
                                disabled={Boolean(saving)}
                                onClick={() => handleSave(user)}
                                className="!w-auto rounded-full px-3 py-2 text-xs"
                              >
                                <Save size={14} />
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={Boolean(saving)}
                                onClick={() => {
                                  setEditingId(null);
                                  setDrafts((current) => ({
                                    ...current,
                                    [user.id]: toDraft(user),
                                  }));
                                }}
                                className="!w-auto rounded-full px-3 py-2 text-xs"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={Boolean(saving)}
                              onClick={() => {
                                setEditingId(user.id);
                                setDrafts((current) => ({
                                  ...current,
                                  [user.id]: toDraft(user),
                                }));
                              }}
                              className="!w-auto rounded-full px-3 py-2 text-xs"
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant={disabled ? "outline" : "primary"}
                            loading={saving === user.id}
                            disabled={Boolean(saving)}
                            onClick={() => handleDisabledChange(user, !disabled)}
                            className={
                              disabled
                                ? "!w-auto rounded-full px-3 py-2 text-xs"
                                : "!w-auto rounded-full bg-error px-3 py-2 text-xs text-on-error hover:bg-error/80"
                            }
                          >
                            {disabled ? <RotateCcw size={14} /> : <ShieldOff size={14} />}
                            {disabled ? "Restore" : "Disable"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">
                Showing {users.length} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="!w-auto px-3 py-2 text-sm"
                >
                  Previous
                </Button>
                <span className="text-sm text-on-surface-variant">
                  Page {page} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="!w-auto px-3 py-2 text-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-6 rounded-xl border border-primary-container/15 bg-primary-container/5 p-4 text-sm text-on-surface-variant">
        <div className="flex items-start gap-2">
          <CheckCircle className="mt-0.5 h-4 w-4 text-primary-container" />
          <p>
            Disabled users are soft-deleted and their refresh tokens are removed.
            Restore them here if the account should become usable again.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
