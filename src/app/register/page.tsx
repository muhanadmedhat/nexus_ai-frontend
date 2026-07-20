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
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useAuth } from "@/hooks/use-auth";
import { signUp } from "@/services/auth";
import { useToast } from "@/components/ui/toast";

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
    description:
      "Create projects, shape briefs, review evaluated work, and manage escrow.",
  },
  {
    value: "freelancer" as const,
    label: "Freelancer",
    icon: UserRoundSearch,
    description:
      "Build your profile, get matched to real tasks, and submit verified work.",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const toast = useToast();

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
      toast.success(
        "Account created",
        "Check your email for the verification code.",
      );
      router.replace("/register/success");
    } catch (err) {
      toast.error(
        "Registration failed",
        err instanceof Error
          ? err.message
          : "Please check your details and try again.",
      );
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col bg-[#f5f5f0] lg:h-screen lg:overflow-hidden lg:flex-row">
      <AuthVisualPanel
        imageSrc="/auth-panel-signup.png"
        sceneUrl="https://prod.spline.design/jENSkvxRxQfrmnBl/scene.splinecode"
        alt="Nexus AI onboarding robot"
        title={
          <>
            Join the workflow
            <br />
            that proves delivery.
          </>
        }
        description={
          <>
            Turn unclear projects into structured briefs, matched tasks,
            evaluated submissions, and escrow-ready milestones.
          </>
        }
      />

      <section className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-8 md:px-10 lg:h-screen lg:overflow-hidden lg:px-8 lg:py-4 xl:px-12">
        <div className="w-full max-w-[500px]">
          <div className="mb-3">
            <h1 className="mb-1.5 font-headline text-3xl font-bold leading-[1.05] tracking-tight text-on-surface md:text-[34px]">
              Create account
            </h1>
            <p className="max-w-sm text-xs leading-5 text-on-surface-variant">
              Choose your role and enter the details Nexus AI needs to start
              routing work clearly.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-3 lg:space-y-2.5"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-on-surface">
                I want to use Nexus AI as
              </p>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {ROLE_CARDS.map(({ value, label, icon: Icon, description }) => {
                  const active = role === value;
                  return (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={active}
                      onClick={() => {
                        setRole(value);
                        setValue("role", value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      className={clsx(
                        "group flex min-h-[94px] flex-col items-start rounded-lg border p-3 text-left transition-all",
                        active
                          ? "border-primary-container bg-primary-container/[0.06] shadow-sm"
                          : "border-outline-variant bg-surface-container-lowest hover:border-primary-container/50 hover:bg-surface-container-low",
                      )}
                    >
                      <span
                        className={clsx(
                          "mb-2 flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                          active
                            ? "bg-primary-container text-on-primary"
                            : "bg-surface-container-high text-outline group-hover:text-primary",
                        )}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="mb-0.5 font-headline text-sm font-semibold text-on-surface">
                        {label}
                      </span>
                      <span className="text-[10.5px] leading-4 text-on-surface-variant">
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
                className="py-2.5 text-sm"
                {...register("firstName")}
                error={errors.firstName?.message}
              />
              <Input
                label="Last name"
                placeholder="Enter last name"
                className="py-2.5 text-sm"
                {...register("lastName")}
                error={errors.lastName?.message}
              />
            </div>
            <Input
              label="Email address"
              type="email"
              placeholder="name@company.com"
              className="py-2.5 text-sm"
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
                  compact
                  error={errors.phoneNumber?.message}
                />
              )}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                className="py-2.5 text-sm"
                {...register("password")}
                error={errors.password?.message}
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="••••••••"
                className="py-2.5 text-sm"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
              />
            </div>
            <Button type="submit" className="py-3 text-sm" loading={isSubmitting}>
              Create account
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-4 text-on-surface-variant">
                Or sign up with
              </span>
            </div>
          </div>

          <GoogleAuthButton
            onBeforeRedirect={() => {
              window.localStorage.setItem("nexus_google_signup_role", role);
            }}
          />

          <p className="mt-4 text-center text-xs text-on-surface-variant">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-primary-container hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
