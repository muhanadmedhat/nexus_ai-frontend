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
import Spline from "@splinetool/react-spline";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useAuth } from "@/hooks/use-auth";
import { signUp } from "@/services/auth";
import { useToast } from "@/components/ui/toast";
import { isValidGithubUsername } from "@/lib/github-username";

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
    githubUsername: z.string().trim().optional(),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/[0-9]/, "Add a number")
      .regex(/[^A-Za-z0-9]/, "Add a symbol"),
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    if (
      values.role === "freelancer" &&
      !isValidGithubUsername(values.githubUsername ?? "")
    ) {
      context.addIssue({
        code: "custom",
        path: ["githubUsername"],
        message: "Enter a valid GitHub username",
      });
    }
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
    defaultValues: { role: "customer", phoneNumber: "", githubUsername: "" },
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
        ...(values.role === "freelancer"
          ? { githubUsername: values.githubUsername?.trim() }
          : {}),
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
    <>
      {/* Hide Spline watermark */}
      <style>
        {`
          .spline-watermark,
          [data-spline-watermark],
          [class*="spline-watermark"],
          .spline-viewer .watermark,
          canvas + div[style*="position: absolute"] {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }
        `}
      </style>

      <main className="relative flex min-h-screen w-full flex-col bg-[#f5f5f0] lg:h-screen lg:overflow-hidden lg:flex-row">
        {/* Left Panel – Exactly as Login Page */}
        <section className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden border-outline-variant/50 bg-surface bg-[radial-gradient(70%_50%_at_50%_42%,rgba(50,73,51,0.08),transparent_72%)] p-8 lg:flex lg:border-r">
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-start">
            <div className="pt-[8vh] font-headline text-6xl font-bold tracking-tight text-on-surface md:text-7xl">
              Nexus <span className="text-primary-container">AI</span>
            </div>
            <p className="mt-6 max-w-md text-center text-lg leading-relaxed text-on-surface-variant">
              Structured briefs. Matched talent.{" "}
              <span className="font-medium text-primary-container">
                Verified work.
              </span>
            </p>

            <div className="w-full flex-1 flex items-center justify-center">
              <Spline
                scene="https://draft.spline.design/joTbeFyFhCIcKsZ1/scene.splinecode"
                className="h-[75vh] w-full"
              />
            </div>
          </div>
        </section>

        {/* Right Panel – Form (unchanged) */}
        <section className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-10 md:px-10 lg:h-screen lg:overflow-hidden lg:px-10 lg:py-5">
          <div className="w-full max-w-[520px]">
            <div className="mb-5">
              <h1 className="mb-2 font-headline text-3xl font-bold leading-tight tracking-tight text-on-surface md:text-4xl">
                Create account
              </h1>
              <p className="max-w-md text-sm leading-6 text-on-surface-variant">
                Choose your role and enter the details Nexus AI needs to start
                routing work clearly.
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 lg:space-y-3"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-on-surface">
                  I want to use Nexus AI as
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {ROLE_CARDS.map(
                    ({ value, label, icon: Icon, description }) => {
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
                    },
                  )}
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
              {role === "freelancer" ? (
                <Input
                  label="GitHub username"
                  placeholder="octocat"
                  autoComplete="username"
                  {...register("githubUsername")}
                  error={errors.githubUsername?.message}
                />
              ) : null}
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
              <Button type="submit" loading={isSubmitting}>
                Create account
              </Button>
            </form>

            <div className="relative my-5">
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

            <p className="mt-5 text-center text-sm text-on-surface-variant">
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

        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden items-center justify-between px-10 py-5 text-xs text-on-surface-variant lg:flex">
          <span className="pointer-events-auto">© 2026 Nexus AI</span>
          <div className="pointer-events-auto flex gap-5">
            <a href="#" className="transition-colors hover:text-on-surface">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-on-surface">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-on-surface">
              Support
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
