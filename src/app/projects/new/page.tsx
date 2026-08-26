"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createProject } from "@/services/projects";
import { useToast } from "@/components/ui/toast";

const schema = z
  .object({
    title: z.string().trim().min(1, "Project title is required").max(255),
    description: z.string().trim().min(1, "Add a short description").max(2000),
    budgetMin: z.number({ message: "Enter a number" }).min(0, "Must be ≥ 0").max(9_999_999_999.99),
    budgetMax: z.number({ message: "Enter a number" }).positive("Must be greater than 0").max(9_999_999_999.99),
    currency: z.enum(["EGP", "USD", "EUR"]),
    deadline: z.string().min(1, "Pick a deadline").refine((value) => {
      const selected = new Date(`${value}T00:00:00Z`);
      const today = new Date();
      const minimum = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 3));
      return !Number.isNaN(selected.getTime()) && selected >= minimum;
    }, "Deadline must be at least 3 days from today"),
    isDeadlineFlexible: z.boolean(),
  })
  .refine((v) => v.budgetMax >= v.budgetMin, {
    message: "Max budget must be ≥ min budget",
    path: ["budgetMax"],
  });

type FormValues = z.infer<typeof schema>;

export default function NewProjectPage() {
  const router = useRouter();
  const toast = useToast();
  const minimumDeadline = (() => {
    const value = new Date();
    value.setUTCDate(value.getUTCDate() + 3);
    return value.toISOString().slice(0, 10);
  })();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "EGP", isDeadlineFlexible: false },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const project = await createProject(values);
      toast.success("Project created", "You can now shape the requirements brief.");
      router.replace(`/projects/${project.id}`);
    } catch (err) {
      toast.error(
        "Could not create project",
        err instanceof Error ? err.message : "Please check the form and try again.",
      );
    }
  };

  return (
    <DashboardShell role="customer" title="New project" subtitle="Describe your project and goals.">
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to projects
      </Link>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-2xl space-y-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow md:p-8"
      >
        <Input
          label="Project title"
          placeholder="E-commerce Website"
          {...register("title")}
          error={errors.title?.message}
        />

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-on-surface">
            Short description
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="Briefly describe what you want to build."
            {...register("description")}
            className="input-halo w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-all placeholder:text-outline/50"
          />
          {errors.description && (
            <span className="text-xs text-error">{errors.description.message}</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Input
            label="Budget min"
            type="number"
            placeholder="10000"
            {...register("budgetMin", { valueAsNumber: true })}
            error={errors.budgetMin?.message}
          />
          <Input
            label="Budget max"
            type="number"
            placeholder="25000"
            {...register("budgetMax", { valueAsNumber: true })}
            error={errors.budgetMax?.message}
          />
          <div className="space-y-2">
            <label htmlFor="currency" className="block text-sm font-medium text-on-surface">
              Currency
            </label>
            <select
              id="currency"
              {...register("currency")}
              className="input-halo w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-all"
            >
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <Input
          label="Deadline"
          type="date"
          min={minimumDeadline}
          {...register("deadline")}
          error={errors.deadline?.message}
        />

        <label className="flex items-center gap-3 text-sm text-on-surface">
          <input
            type="checkbox"
            {...register("isDeadlineFlexible")}
            className="h-4 w-4 rounded border-outline-variant accent-primary-container"
          />
          Deadline is flexible
        </label>
        <div className="flex gap-3">
          <Button type="submit" loading={isSubmitting} className="inline-flex w-auto px-6">
            Create project
          </Button>
          <Link href="/projects">
            <Button type="button" variant="outline" className="inline-flex w-auto px-6">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </DashboardShell>
  );
}
