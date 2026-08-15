"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Controller, useForm } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";
import {
  Award,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Code2,
  FileText,
  Mail,
  Save,
  Upload,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateMe } from "@/services/users";
import {
  getMyFreelancerProfile,
  updateMyFreelancerProfile,
  type FreelancerProfile,
} from "@/services/freelancers";
import { uploadProfileImage, uploadCv } from "@/services/uploads";
import { useToast } from "@/components/ui/toast";

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  availabilityHoursPerWeek: string;
  githubUsername: string;
}

// GitHub username rules: letters, numbers and single hyphens, no leading or
// trailing hyphen. Required before repository invites, not for verification.
const GITHUB_USERNAME_PATTERN = /^(?!.*--)[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

function isEgyptianPhoneNumber(value: string) {
  return value.startsWith("+20") && isValidPhoneNumber(value);
}

function parseNonNegativeInteger(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const role = user?.role || "customer";
  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isUploadingCV, setIsUploadingCV] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [cvStatusMessage, setCvStatusMessage] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [freelancerProfile, setFreelancerProfile] = useState<FreelancerProfile | null>(null);
  const displayedCvUrl = cvUrl ?? user?.cvUrl ?? null;
  const cvInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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
      availabilityHoursPerWeek: "",
      githubUsername: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    let active = true;
    const baseValues: ProfileFormValues = {
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber ?? "",
      availabilityHoursPerWeek: "",
      githubUsername: "",
    };

    reset(baseValues);

    if (role !== "freelancer") {
      return;
    }

    getMyFreelancerProfile()
      .then((profile) => {
        if (!active) return;
        setFreelancerProfile(profile);
        setCvUrl(profile.cvUrl);
        reset({
          ...baseValues,
          availabilityHoursPerWeek:
            profile.availabilityHoursPerWeek == null
              ? ""
              : String(profile.availabilityHoursPerWeek),
          githubUsername: profile.githubUsername ?? "",
        });
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          "Could not load freelancer details",
          error instanceof Error ? error.message : "Please try again.",
        );
      });

    return () => {
      active = false;
    };
  }, [reset, role, toast, user]);

  const onSubmit = async (values: ProfileFormValues) => {
    const nextValues = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phoneNumber: values.phoneNumber,
      availabilityHoursPerWeek: values.availabilityHoursPerWeek,
      githubUsername: values.githubUsername.trim(),
    };

    const availabilityHoursPerWeek = parseNonNegativeInteger(values.availabilityHoursPerWeek);

    if (role === "freelancer") {
      if (Number.isNaN(availabilityHoursPerWeek)) {
        toast.error("Invalid availability", "Availability must be whole hours per week.");
        return;
      }
    }

    try {
      await updateMe({
        firstName: nextValues.firstName,
        lastName: nextValues.lastName,
        phoneNumber: nextValues.phoneNumber,
      });

      let updatedFreelancer = freelancerProfile;
      if (role === "freelancer") {
        updatedFreelancer = await updateMyFreelancerProfile({
          availabilityHoursPerWeek,
          ...(nextValues.githubUsername
            ? { githubUsername: nextValues.githubUsername }
            : {}),
        });
        setFreelancerProfile(updatedFreelancer);
        setCvUrl(updatedFreelancer.cvUrl);
      }

      await refresh();
      reset({
        ...nextValues,
        availabilityHoursPerWeek:
          updatedFreelancer?.availabilityHoursPerWeek == null
            ? nextValues.availabilityHoursPerWeek
            : String(updatedFreelancer.availabilityHoursPerWeek),
        githubUsername:
          updatedFreelancer?.githubUsername ?? nextValues.githubUsername,
      });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(
        "Could not update profile",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleFileSelect = async (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Only JPG, PNG, and WebP images are allowed");
      toast.error("Invalid image", "Only JPG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image must be smaller than 2MB");
      toast.error("Image too large", "Image must be smaller than 2MB.");
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    try {
      const { url } = await uploadProfileImage(file);
      setPreviewUrl(url);
      await refresh();
      toast.success("Profile image updated");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      toast.error(
        "Upload failed",
        err instanceof Error ? err.message : "Could not upload image.",
      );
      setPreviewUrl(null);
    } finally {
      URL.revokeObjectURL(objectUrl);
      setIsUploading(false);
    }
  };

  const handleCvSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validTypes = ["application/pdf"];
    if (!validTypes.includes(file.type)) {
      setCvUploadError("Only PDF files are allowed");
      toast.error("Invalid CV", "Only PDF files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCvUploadError("CV must be smaller than 5MB");
      toast.error("CV too large", "CV must be smaller than 5MB.");
      return;
    }
    setCvUploadError(null);
    setCvStatusMessage(null);
    setIsUploadingCV(true);
    setCvFileName(file.name);
    try {
      const { url } = await uploadCv(file);
      setCvUrl(url);
      await refresh();
      setCvStatusMessage("CV uploaded successfully");
      toast.success("CV uploaded successfully");
    } catch (err) {
      setCvUploadError(err instanceof Error ? err.message : "CV upload failed");
      toast.error(
        "CV upload failed",
        err instanceof Error ? err.message : "Please try again.",
      );
      setCvFileName(null);
    } finally {
      setIsUploadingCV(false);
      if (cvInputRef.current) cvInputRef.current.value = "";
    }
  };

  const skillScores = freelancerProfile?.skillScores ?? [];
  const averageSkillScore =
    skillScores.length > 0
      ? skillScores.reduce((sum, skill) => sum + (Number(skill.score) || 0), 0) /
        skillScores.length
      : null;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const photoUrl = previewUrl ?? user?.photoUrl ?? null;
  const availabilityLabel =
    freelancerProfile?.availabilityHoursPerWeek == null
      ? "Availability not set"
      : `${freelancerProfile.availabilityHoursPerWeek} hrs/week`;

  return (
    <DashboardShell
      role={role as "customer" | "freelancer" | "admin"}
      title="Profile"
      subtitle="Manage your personal information and preferences."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-primary-container text-4xl font-semibold text-on-primary shadow-sm">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={`${user?.firstName ?? "User"} profile`}
                    fill
                    unoptimized
                    sizes="96px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">{initials}</span>
                )}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-lowest text-primary-container shadow-sm transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Upload profile image"
                >
                  <Camera size={17} />
                </button>
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFileSelect(file);
                  event.currentTarget.value = "";
                }}
              />

              <div className="min-w-0">
                <p className="text-sm font-medium text-primary-container">{roleLabel}</p>
                <h2 className="truncate font-headline text-2xl font-bold text-on-surface sm:text-3xl">
                  {user?.firstName || "User"} {user?.lastName || ""}
                </h2>
                <p className="mt-1 truncate text-sm text-on-surface-variant">
                  {user?.email || "No email saved"}
                </p>
                {uploadError ? <p className="mt-2 text-sm text-error">{uploadError}</p> : null}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[420px]">
              {role === "freelancer" ? (
                <>
                  <ProfileStat
                    label="CV"
                    value={displayedCvUrl ? "Uploaded" : "Missing"}
                    active={Boolean(displayedCvUrl)}
                  />
                  <ProfileStat
                    label="Availability"
                    value={availabilityLabel}
                    active={freelancerProfile?.availabilityHoursPerWeek != null}
                  />
                  <ProfileStat
                    label="Rated skills"
                    value={skillScores.length === 0 ? "Not ready" : String(skillScores.length)}
                    active={skillScores.length > 0}
                  />
                  <ProfileStat
                    label="Avg score"
                    value={averageSkillScore == null ? "Not ready" : `${averageSkillScore.toFixed(1)} / 5.0`}
                    active={averageSkillScore != null}
                  />
                </>
              ) : (
                <>
                  <ProfileStat
                    label="Email"
                    value={user?.email ? "Saved" : "Missing"}
                    active={Boolean(user?.email)}
                  />
                  <ProfileStat
                    label="Phone"
                    value={user?.phoneNumber ? "Saved" : "Missing"}
                    active={Boolean(user?.phoneNumber)}
                  />
                </>
              )}
            </div>
          </div>
        </section>

        <div
          className={
            role === "freelancer"
              ? "grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]"
              : "max-w-5xl"
          }
        >
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow sm:p-6">
            <h3 className="mb-5 font-headline text-lg font-semibold text-on-surface">
              Personal Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            </div>
          </section>

          {role === "freelancer" && (
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 card-shadow sm:p-6">
              <h3 className="mb-5 font-headline text-lg font-semibold text-on-surface">
                Freelancer Setup
              </h3>

              <div className="space-y-4">
                <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-container/15 text-primary-container">
                        <FileText size={21} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-on-surface">CV</h4>
                        <p className="text-sm leading-5 text-on-surface-variant">
                          {displayedCvUrl
                            ? "Your resume is attached to your verification profile."
                            : "Upload your resume as a PDF to continue verification."}
                        </p>
                        {cvFileName ? (
                          <p className="mt-2 truncate text-sm text-on-surface-variant">
                            {cvFileName}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <input
                        ref={cvInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleCvSelect}
                        disabled={isUploadingCV}
                      />
                      <button
                        type="button"
                        onClick={() => cvInputRef.current?.click()}
                        disabled={isUploadingCV}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary-container/30 bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-primary-container transition-colors hover:bg-primary-container hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Upload size={16} />
                        {isUploadingCV ? "Uploading" : "Upload PDF"}
                      </button>
                      {displayedCvUrl ? (
                        <a
                          href={displayedCvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                        >
                          <ExternalLink size={16} />
                          View
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {cvUploadError ? <p className="mt-3 text-sm text-error">{cvUploadError}</p> : null}
                  {cvStatusMessage ? (
                    <p className="mt-3 text-sm font-medium text-primary-container">
                      {cvStatusMessage}
                    </p>
                  ) : null}
                </div>

                <Input
                  label="Availability"
                  type="number"
                  min={1}
                  max={168}
                  step={1}
                  placeholder="20"
                  disabled={isSubmitting}
                  icon={<Clock size={18} className="text-outline" />}
                  trailing={
                    <span className="shrink-0 text-sm text-on-surface-variant">
                      hrs/week
                    </span>
                  }
                  {...register("availabilityHoursPerWeek", {
                    validate: (value) => {
                      const parsed = parseNonNegativeInteger(value);
                      return (
                        (parsed !== undefined &&
                          !Number.isNaN(parsed) &&
                          parsed > 0 &&
                          parsed <= 168) ||
                        "Enter 1-168 hours per week"
                      );
                    },
                  })}
                  error={errors.availabilityHoursPerWeek?.message}
                />

                <Input
                  label="GitHub username"
                  placeholder="octocat"
                  disabled={isSubmitting}
                  icon={<Code2 size={18} className="text-outline" />}
                  labelExtra={
                    <span className="text-xs text-on-surface-variant">
                      for repository invites
                    </span>
                  }
                  {...register("githubUsername", {
                    validate: (value) =>
                      !value.trim() ||
                      (value.trim().length <= 120 &&
                        GITHUB_USERNAME_PATTERN.test(value.trim())) ||
                      "Letters, numbers and single hyphens only",
                  })}
                  error={errors.githubUsername?.message}
                />
              </div>
            </section>
          )}
        </div>

        {role === "freelancer" ? (
          <SkillScoresTable skillScores={skillScores} averageScore={averageSkillScore} />
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            className="inline-flex w-full items-center justify-center px-4 py-2.5 text-sm sm:w-auto"
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
    </DashboardShell>
  );
}

function ProfileStat({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2.5">
      <div className="flex items-center gap-2">
        <CheckCircle2
          size={15}
          className={active ? "text-primary-container" : "text-outline"}
        />
        <p className="text-xs font-medium uppercase text-on-surface-variant">{label}</p>
      </div>
      <p className="mt-1 truncate font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function SkillScoresTable({
  skillScores,
  averageScore,
}: {
  skillScores: NonNullable<FreelancerProfile["skillScores"]>;
  averageScore: number | null;
}) {
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest card-shadow">
      <div className="flex flex-col gap-4 border-b border-outline-variant/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container/15 text-primary-container">
            <Award size={19} />
          </div>
          <div>
            <h3 className="font-headline text-lg font-semibold text-on-surface">
              Assessment skill ratings
            </h3>
            <p className="text-sm text-on-surface-variant">
              Generated from your assessment performance.
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
          Average{" "}
          <span className="font-semibold tabular-nums text-on-surface">
            {averageScore == null ? "not ready" : `${averageScore.toFixed(1)} / 5.0`}
          </span>
        </div>
      </div>

      {skillScores.length === 0 ? (
        <div className="px-5 py-8 text-sm text-on-surface-variant sm:px-6">
          Complete your assessment to generate skill ratings.
        </div>
      ) : (
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 sm:p-6">
          {skillScores.map((skill) => {
            const score = Math.max(0, Math.min(5, Number(skill.score) || 0));
            const percent = (score / 5) * 100;

            return (
              <div
                key={skill.id}
                className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="min-w-0 text-sm font-semibold leading-5 text-on-surface">
                    {skill.skill}
                  </p>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums text-primary-container">
                      {score.toFixed(1)}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">out of 5.0</p>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-surface-container-high">
                  <div
                    className="h-2 rounded-full bg-primary-container"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
