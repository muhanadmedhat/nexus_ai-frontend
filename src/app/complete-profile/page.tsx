"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, UserRoundSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/logo";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { clsx } from "clsx";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(6, "Enter a valid phone number"),
  role: z.enum(["customer", "freelancer"]),
});

type FormValues = z.infer<typeof schema>;

const ROLE_CARDS = [
  {
    value: "customer" as const,
    label: "Client",
    icon: Briefcase,
    description: "Create projects, define goals, and track progress.",
  },
  {
    value: "freelancer" as const,
    label: "Freelancer",
    icon: UserRoundSearch,
    description: "Build your profile, get matched, and deliver work.",
  },
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "customer" },
  });

  const role = watch("role");

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await api.post("/auth/complete-profile", {
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber,
        role: values.role,
      });
      await refresh();
      router.replace(
        values.role === "freelancer" ? "/freelancer/onboarding" : `/dashboard/${values.role}`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to complete profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex w-full items-center justify-between px-6 py-4 md:px-10">
        <Logo className="text-2xl" />
      </header>

      <main className="mx-auto w-full max-w-[680px] flex-1 px-5 py-8">
        <div className="card-shadow rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 md:p-10">
          <div className="mb-10 text-center">
            <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
              Complete your profile
            </h1>
            <p className="text-on-surface-variant">
              Tell us a bit about yourself to get started.
            </p>
          </div>

          <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
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
              label="Phone number"
              type="tel"
              placeholder="+201000000000"
              {...register("phoneNumber")}
              error={errors.phoneNumber?.message}
            />

            {formError && <p className="text-sm text-error">{formError}</p>}

            <Button type="submit" loading={isSubmitting}>
              Continue
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}