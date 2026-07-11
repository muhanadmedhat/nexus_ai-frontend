"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";
import { clsx } from "clsx";
import { Briefcase, UserRoundSearch } from "lucide-react";
import { AuthVisualPanel } from "@/components/layout/auth-visual-panel";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { completeProfile } from "@/services/auth";
import { DASHBOARD_BY_ROLE } from "@/types/auth";
import { useToast } from "@/components/ui/toast";

type CompleteProfileValues = {
  phoneNumber: string;
  role: "customer" | "freelancer";
};

const ROLE_CARDS = [
  {
    value: "customer" as const,
    label: "Client",
    icon: Briefcase,
    description: "Create projects and review work.",
  },
  {
    value: "freelancer" as const,
    label: "Freelancer",
    icon: UserRoundSearch,
    description: "Build a profile and get matched to tasks.",
  },
];

function getStoredGoogleRole() {
  if (typeof window === "undefined") return "customer";
  const stored = window.localStorage.getItem("nexus_google_signup_role");
  return stored === "freelancer" ? "freelancer" : "customer";
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const toast = useToast();
  const defaultRole = useMemo(() => getStoredGoogleRole(), []);
  const [role, setRole] = useState<CompleteProfileValues["role"]>(defaultRole);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompleteProfileValues>({
    defaultValues: { phoneNumber: "", role: defaultRole },
  });

  const onSubmit = async (values: CompleteProfileValues) => {
    try {
      const user = await completeProfile({
        phoneNumber: values.phoneNumber,
        role: values.role,
      });
      window.localStorage.removeItem("nexus_google_signup_role");
      await refresh();
      toast.success("Profile completed", "Your workspace is ready.");
      router.replace(DASHBOARD_BY_ROLE[user.role]);
    } catch (error) {
      toast.error(
        "Could not complete profile",
        error instanceof Error ? error.message : "Please check your details and try again.",
      );
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col bg-[#f5f5f0] lg:h-screen lg:overflow-hidden lg:flex-row">
      <AuthVisualPanel
        imageSrc="/auth-panel-signup.png"
        alt="AI onboarding workflow"
        title={
          <>
            One last step
            <br />
            before the dashboard.
          </>
        }
        description="Tell Nexus AI how you want to use the platform so we can route you to the right workspace."
      />

      <section className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-10 md:px-10 lg:h-screen lg:overflow-hidden">
        <div className="w-full max-w-[520px]">
          <div className="mb-6">
            <h1 className="mb-2 font-headline text-3xl font-bold leading-tight text-on-surface md:text-4xl">
              Complete your profile
            </h1>
            <p className="text-sm leading-6 text-on-surface-variant">
              Add your phone number and choose your account type.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-on-surface">I want to use Nexus AI as</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {ROLE_CARDS.map(({ value, label, icon: Icon, description }) => {
                  const active = role === value;
                  return (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={active}
                      onClick={() => {
                        setRole(value);
                        setValue("role", value, { shouldDirty: true, shouldValidate: true });
                      }}
                      className={clsx(
                        "group flex min-h-[104px] flex-col items-start rounded-lg border p-3 text-left transition-all",
                        active
                          ? "border-primary-container bg-primary-container/[0.06] shadow-sm"
                          : "border-outline-variant bg-surface-container-lowest hover:border-primary-container/50",
                      )}
                    >
                      <span
                        className={clsx(
                          "mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                          active
                            ? "bg-primary-container text-on-primary"
                            : "bg-surface-container-high text-outline group-hover:text-primary",
                        )}
                      >
                        <Icon size={20} />
                      </span>
                      <span className="mb-1 font-headline text-base font-semibold text-on-surface">
                        {label}
                      </span>
                      <span className="text-[11px] leading-4 text-on-surface-variant">
                        {description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Controller
              name="phoneNumber"
              control={control}
              rules={{
                required: "Phone number is required",
                validate: (value) =>
                  (value.startsWith("+20") && isValidPhoneNumber(value)) ||
                  "Enter a valid Egyptian phone number",
              }}
              render={({ field }) => (
                <PhoneNumberInput
                  label="Phone number"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.phoneNumber?.message}
                />
              )}
            />
            <Button type="submit" loading={isSubmitting}>
              Continue
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
