"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { clsx } from "clsx";
import { Briefcase, UserRoundSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { Button } from "@/components/ui/button";
import { AuthVisualPanel } from "@/components/layout/auth-visual-panel";
import { useAuth } from "@/hooks/use-auth";
import { signUp } from "@/services/auth";
import { DASHBOARD_BY_ROLE } from "@/types/auth";

const schema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email"),
    phoneNumber: z
      .string()
      .min(1, "Phone number is required")
      .refine(
        (value) => value.startsWith("+20") && isValidPhoneNumber(value),
        "Enter a valid Egyptian phone number",
      ),
    role: z.enum(["customer", "freelancer"]),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/[0-9]/, "Add a number")
      .regex(/[^A-Za-z0-9]/, "Add a symbol"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const ROLE_CARDS = [
  {
    value: "customer" as const,
    label: "Client",
    icon: Briefcase,
    description: "Create projects, shape briefs, review evaluated work, and manage escrow.",
  },
  {
    value: "freelancer" as const,
    label: "Freelancer",
    icon: UserRoundSearch,
    description: "Build your profile, get matched to real tasks, and submit verified work.",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "customer", phoneNumber: "" },
  });

  const [role, setRole] = useState<FormValues["role"]>("customer");

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await signUp({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber,
        password: values.password,
        role: values.role,
      });
      await refresh();
      router.replace(DASHBOARD_BY_ROLE[values.role]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col bg-[#f5f5f0] lg:h-screen lg:overflow-hidden lg:flex-row">
      <AuthVisualPanel
        imageSrc="/auth-panel-signup.png"
        alt="AI onboarding workflow"
        title={
          <>
            Join the workflow
            <br />
            that proves delivery.
          </>
        }
        description={
          <>
            Turn unclear projects into structured briefs, matched tasks, evaluated submissions,
            and escrow-ready milestones.
          </>
        }
      />

      <section className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-10 md:px-10 lg:h-screen lg:overflow-hidden lg:px-10 lg:py-5">
        <div className="w-full max-w-[520px]">
          <div className="mb-5">
            <h1 className="mb-2 font-headline text-3xl font-bold leading-tight tracking-tight text-on-surface md:text-4xl">
              Create account
            </h1>
            <p className="max-w-md text-sm leading-6 text-on-surface-variant">
              Choose your role and enter the details Nexus AI needs to start routing work clearly.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 lg:space-y-3">
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
                        "group flex min-h-[116px] flex-col items-start rounded-lg border p-4 text-left transition-all lg:min-h-[104px] lg:p-3",
                        active
                          ? "border-primary-container bg-primary-container/[0.06] shadow-sm"
                          : "border-outline-variant bg-surface-container-lowest hover:border-primary-container/50 hover:bg-surface-container-low",
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="First name"
                placeholder="Enter first name"
                {...register("firstName")}
                error={errors.firstName?.message}
              />
              <Input
                label="Last name"
                placeholder="Enter last name"
                {...register("lastName")}
                error={errors.lastName?.message}
              />
            </div>
            <Input
              label="Email address"
              type="email"
              placeholder="name@company.com"
              {...register("email")}
              error={errors.email?.message}
            />
            <Controller
              name="phoneNumber"
              control={control}
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                error={errors.password?.message}
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="••••••••"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
              />
            </div>

            {formError && <p className="text-sm text-error">{formError}</p>}

            <Button type="submit" loading={isSubmitting}>
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary-container hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
