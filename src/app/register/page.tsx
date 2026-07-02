"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { clsx } from "clsx";
import { Briefcase, UserRoundSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/logo";
import { useAuth } from "@/hooks/use-auth";
import { signUp } from "@/services/auth";
import { DASHBOARD_BY_ROLE } from "@/types/auth";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email"),
    phoneNumber: z.string().min(6, "Enter a valid phone number"),
    role: z.enum(["customer", "freelancer"]),
    password: z.string().min(8, "At least 8 characters"),
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
      "Create projects, define goals, track progress, and release escrow when work passes evaluation.",
  },
  {
    value: "freelancer" as const,
    label: "Freelancer",
    icon: UserRoundSearch,
    description:
      "Build your AI-assisted profile, get matched to real-fit tasks, and submit work for objective evaluation.",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "customer" },
  });

  const role = watch("role");

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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex w-full items-center justify-between px-6 py-4 md:px-10">
        <Logo className="text-2xl" />
        <Link
          href="/login"
          className="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          Sign In
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[680px] flex-1 px-5 py-8">
        <div className="card-shadow rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 md:p-10">
          <div className="mb-12 text-center">
            <Logo className="mb-3 justify-center text-base" />
            <h1 className="mb-1 font-headline text-3xl font-semibold tracking-tight text-on-surface">
              Create your Nexus AI account
            </h1>
            <p className="text-on-surface-variant">Choose how you want to use the platform.</p>
          </div>

          <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {ROLE_CARDS.map(({ value, label, icon: Icon, description }) => {
              const active = role === value;
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => setValue("role", value)}
                  className={clsx(
                    "flex flex-col items-start rounded-lg border-2 p-6 text-left transition-all",
                    active
                      ? "border-primary-container bg-primary-container/[0.04]"
                      : "border-outline-variant hover:border-primary-container/50",
                  )}
                >
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
                    <Icon size={20} className="text-outline" />
                  </span>
                  <span className="mb-1 font-headline text-xl font-semibold text-on-surface">
                    {label}
                  </span>
                  <p className="text-xs leading-relaxed text-on-surface-variant">{description}</p>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
            <Input
              label="Phone number"
              type="tel"
              placeholder="+1 (555) 000-0000"
              {...register("phoneNumber")}
              error={errors.phoneNumber?.message}
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

          <p className="mt-12 text-center text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary-container hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <footer className="mt-12 flex flex-col items-center justify-between gap-3 text-xs text-on-surface-variant opacity-60 md:flex-row">
          <p>© 2024 Nexus AI. Digital Craftsmanship for the Global Enterprise.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:underline">
              Terms of Service
            </Link>
            <Link href="#" className="hover:underline">
              Help Center
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
