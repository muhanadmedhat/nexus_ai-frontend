"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Clock, DollarSign, FileText, Mail, Save } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateMe } from "@/services/users";

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

function isEgyptianPhoneNumber(value: string) {
  return value.startsWith("+20") && isValidPhoneNumber(value);
}

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const role = user?.role || "customer";
  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "?";
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
    },
  });

  useEffect(() => {
    if (!user) return;

    reset({
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber ?? "",
    });
  }, [reset, user]);

  const onSubmit = async (values: ProfileFormValues) => {
    setFormError(null);
    setStatusMessage(null);

    const nextValues = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phoneNumber: values.phoneNumber,
    };

    try {
      await updateMe(nextValues);
      await refresh();
      reset(nextValues);
      setStatusMessage("Profile updated.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not update profile");
    }
  };

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
              {initials}
            </div>
            <h3 className="text-lg font-semibold text-on-surface">
              {user?.firstName} {user?.lastName}
            </h3>
            <p className="text-sm capitalize text-on-surface-variant">{role}</p>
            <p className="text-sm text-on-surface-variant">{user?.email}</p>
            <Button className="mt-4 w-full" variant="outline" disabled>
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="First Name"
                  disabled={isSubmitting}
                  {...register("firstName", {
                    validate: (value) => value.trim().length > 0 || "First name is required",
                  })}
                  error={errors.firstName?.message}
                />
                <Input
                  label="Last Name"
                  disabled={isSubmitting}
                  {...register("lastName", {
                    validate: (value) => value.trim().length > 0 || "Last name is required",
                  })}
                  error={errors.lastName?.message}
                />
              </div>
              <Input
                label="Email Address"
                value={user?.email || ""}
                disabled
                readOnly
                icon={<Mail size={18} className="text-outline" />}
              />
              <Controller
                name="phoneNumber"
                control={control}
                rules={{
                  validate: (value) =>
                    !value || isEgyptianPhoneNumber(value) || "Enter a valid Egyptian phone number",
                }}
                render={({ field }) => (
                  <PhoneNumberInput
                    label="Phone Number"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.phoneNumber?.message}
                  />
                )}
              />

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

              {formError && <p className="text-sm text-error">{formError}</p>}
              {statusMessage && <p className="text-sm text-primary-container">{statusMessage}</p>}

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  loading={isSubmitting}
                  disabled={!isDirty || isSubmitting}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Save size={18} />
                    Save Changes
                  </span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
