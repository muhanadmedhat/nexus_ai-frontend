"use client";

import { User, Mail, Phone, Briefcase, DollarSign, Clock, FileText } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilePage() {
  const { user } = useAuth();
  const role = user?.role || "customer";

  return (
    <DashboardShell
      role={role as "customer" | "freelancer" | "admin"}
      title="Profile"
      subtitle="Manage your personal information and preferences."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Photo & basic info */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 text-center card-shadow">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary-container text-3xl font-bold text-on-primary">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <h3 className="text-lg font-semibold text-on-surface">
              {user?.firstName} {user?.lastName}
            </h3>
            <p className="text-sm capitalize text-on-surface-variant">{role}</p>
            <p className="text-sm text-on-surface-variant">{user?.email}</p>
            <Button className="mt-4 w-full" variant="outline">
              Change Photo
            </Button>
          </div>
        </div>

        {/* Form fields */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <h3 className="mb-4 font-headline text-lg font-semibold text-on-surface">
              Personal Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="First Name" defaultValue={user?.firstName || ""} disabled />
                <Input label="Last Name" defaultValue={user?.lastName || ""} disabled />
              </div>
              <Input label="Email Address" defaultValue={user?.email || ""} disabled icon={<Mail size={18} className="text-outline" />} />
              <Input label="Phone Number" defaultValue={user?.phoneNumber || "Not set"} disabled icon={<Phone size={18} className="text-outline" />} />

              {role === "freelancer" && (
                <>
                  <div className="mt-6 border-t border-outline-variant/20 pt-6">
                    <h4 className="mb-4 font-headline text-base font-semibold text-on-surface">
                      Freelancer Details
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input label="Hourly Rate" defaultValue="$0.00" disabled icon={<DollarSign size={18} className="text-outline" />} />
                      <Input label="Availability" defaultValue="Not set" disabled icon={<Clock size={18} className="text-outline" />} />
                    </div>
                    <Input label="CV URL" defaultValue="No CV uploaded" disabled icon={<FileText size={18} className="text-outline" />} />
                    <Input label="Profile Summary" defaultValue="Complete your profile to get matched with projects." disabled />
                  </div>
                </>
              )}

              <div className="pt-4">
                <Button className="w-full sm:w-auto" disabled>
                  Save Changes (Coming Soon)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}