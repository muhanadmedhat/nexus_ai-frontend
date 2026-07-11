"use client";

import { useEffect, useState, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Clock, DollarSign, Mail, Save } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateMe } from "@/services/users";
import { uploadProfileImage, uploadCv } from "@/services/uploads";
import { ProfileCard } from "@/components/profile/profile-card";
import { useToast } from "@/components/ui/toast";

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
  const displayedCvUrl = cvUrl ?? user?.cvUrl ?? null;
  const cvInputRef = useRef<HTMLInputElement>(null);

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
    const nextValues = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phoneNumber: values.phoneNumber,
    };
    try {
      await updateMe(nextValues);
      await refresh();
      reset(nextValues);
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

  return (
    <DashboardShell
      role={role as "customer" | "freelancer" | "admin"}
      title="Profile"
      subtitle="Manage your personal information and preferences."
    >
      <div className="flex flex-col items-center">
        {/* Profile Card - Skew/3D effect */}
        <ProfileCard
          firstName={user?.firstName || ""}
          lastName={user?.lastName || ""}
          role={role}
          email={user?.email || ""}
          photoUrl={previewUrl ?? user?.photoUrl ?? null}
          initials={initials}
          isUploading={isUploading}
          onFileSelect={handleFileSelect}
          uploadError={uploadError}
        />

        {/* Form card */}
        <div className="mt-12 w-full max-w-2xl">
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
                <div className="mt-6 border-t border-outline-variant/20 pt-6">
                  <h4 className="mb-4 font-headline text-base font-semibold text-on-surface">
                    Freelancer Details
                  </h4>

                  {/* CV Upload Card */}
                  <div className="relative overflow-hidden rounded-xl border border-primary-container/30 bg-primary-container/5 p-5 flex flex-col items-start gap-3 group min-h-[160px]">
                    {/* Animated Person Icon – Layer 1 */}
                    <svg
                      className="absolute -bottom-1 -right-1 w-32 h-32 fill-surface-container-lowest stroke-primary-container/20 transition-transform duration-500 group-hover:scale-110 pointer-events-none"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 64 64"
                    >
                      <path
                        data-name="layer1"
                        d="M 50.4 51 C 40.5 49.1 40 46 40 44 v -1.2 a 18.9 18.9 0 0 0 5.7 -8.8 h 0.1 c 3 0 3.8 -6.3 3.8 -7.3 s 0.1 -4.7 -3 -4.7 C 53 4 30 0 22.3 6 c -5.4 0 -5.9 8 -3.9 16 c -3.1 0 -3 3.8 -3 4.7 s 0.7 7.3 3.8 7.3 c 1 3.6 2.3 6.9 4.7 9 v 1.2 c 0 2 0.5 5 -9.5 6.8 S 2 62 2 62 h 60 a 14.6 14.6 0 0 0 -11.6 -11 z"
                        strokeMiterlimit={10}
                        strokeWidth={5}
                      />
                    </svg>

                    {/* Animated Person Icon – Layer 2 */}
                    <svg
                      className="absolute -bottom-2 -right-1 w-32 h-32 fill-surface-container-lowest stroke-primary-container/10 transition-transform duration-300 group-hover:scale-110 pointer-events-none"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 64 64"
                    >
                      <path
                        data-name="layer1"
                        d="M 50.4 51 C 40.5 49.1 40 46 40 44 v -1.2 a 18.9 18.9 0 0 0 5.7 -8.8 h 0.1 c 3 0 3.8 -6.3 3.8 -7.3 s 0.1 -4.7 -3 -4.7 C 53 4 30 0 22.3 6 c -5.4 0 -5.9 8 -3.9 16 c -3.1 0 -3 3.8 -3 4.7 s 0.7 7.3 3.8 7.3 c 1 3.6 2.3 6.9 4.7 9 v 1.2 c 0 2 0.5 5 -9.5 6.8 S 2 62 2 62 h 60 a 14.6 14.6 0 0 0 -11.6 -11 z"
                        strokeMiterlimit={10}
                        strokeWidth={2}
                      />
                    </svg>

                    {/* Main content */}
                    <div className="relative z-10">
                      <span className="font-bold text-3xl text-primary-container">CV</span>
                      <p className="text-sm text-on-surface-variant">Upload your resume</p>
                    </div>

                    <input
                      ref={cvInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleCvSelect}
                      disabled={isUploadingCV}
                    />

                    <button
                      onClick={() => cvInputRef.current?.click()}
                      disabled={isUploadingCV}
                      className="relative z-10 inline-flex items-center gap-3 rounded-lg border border-primary-container/30 bg-surface-container-lowest px-4 py-2 font-semibold text-primary-container transition-colors hover:bg-primary-container hover:text-on-primary disabled:opacity-60"
                    >
                      {isUploadingCV ? "Uploading..." : "Upload CV"}
                      <svg
                        className="h-5 w-5 fill-current"
                        viewBox="0 0 100 100"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22.1,77.9a4,4,0,0,1,4-4H73.9a4,4,0,0,1,0,8H26.1A4,4,0,0,1,22.1,77.9ZM35.2,47.2a4,4,0,0,1,5.7,0L46,52.3V22.1a4,4,0,1,1,8,0V52.3l5.1-5.1a4,4,0,0,1,5.7,0,4,4,0,0,1,0,5.6l-12,12a3.9,3.9,0,0,1-5.6,0l-12-12A4,4,0,0,1,35.2,47.2Z"
                          fillRule="evenodd"
                        />
                      </svg>
                    </button>

                    {/* File info */}
                    <div className="relative z-10 flex flex-wrap items-center gap-3 mt-1">
                      {cvFileName && (
                        <span className="rounded-full bg-surface-container-lowest/80 px-3 py-1 text-sm text-on-surface-variant">
                          {cvFileName}
                        </span>
                      )}
                      {displayedCvUrl && (
                        <a
                          href={displayedCvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary-container hover:underline"
                        >
                          View CV
                        </a>
                      )}
                    </div>

                    {cvUploadError && (
                      <p className="relative z-10 text-sm text-error">{cvUploadError}</p>
                    )}
                    {cvStatusMessage && (
                      <p className="relative z-10 text-sm text-primary-container">{cvStatusMessage}</p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Hourly Rate"
                      defaultValue="$0.00"
                      disabled
                      icon={<DollarSign size={18} className="text-outline" />}
                    />
                    <Input
                      label="Availability"
                      defaultValue="Not set"
                      disabled
                      icon={<Clock size={18} className="text-outline" />}
                    />
                  </div>
                  <Input
                    label="Profile Summary"
                    defaultValue="Complete your profile to get matched with projects."
                    disabled
                  />
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  className="inline-flex w-auto items-center justify-center px-4 py-2.5 text-sm"
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
