"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronRight, Upload, User } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getFreelancerProfile, updateFreelancerProfile } from "@/services/freelancers";
import { uploadProfileImage, uploadCv } from "@/services/uploads";

const schema = z.object({
  headline: z.string().min(1, "Headline is required"),
  bio: z.string().min(20, "Bio should be at least 20 characters"),
  skills: z.string().min(1, "At least one skill is required"),
  yearsExperience: z.number().min(0, "Must be a positive number"),
  hourlyRate: z.number().min(1, "Hourly rate must be greater than 0"),
  isAvailable: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function FreelancerOnboardingPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(user?.photoUrl || null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      headline: "",
      bio: "",
      skills: "",
      yearsExperience: 0,
      hourlyRate: 0,
      isAvailable: true,
    },
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getFreelancerProfile();
        if (profile) {
          reset({
            headline: profile.headline || "",
            bio: profile.bio || "",
            skills: profile.skills?.join(", ") || "",
            yearsExperience: profile.yearsExperience || 0,
            hourlyRate: profile.hourlyRate || 0,
            isAvailable: profile.isAvailable ?? true,
          });
          if (profile.photoUrl) setImagePreview(profile.photoUrl);
          if (profile.cvUrl) {
            setCvUrl(profile.cvUrl);
            const parts = profile.cvUrl.split("/");
            setCvFileName(parts[parts.length - 1]);
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [reset]);

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    setStatusMessage(null);

    try {
      await updateFreelancerProfile({
        headline: values.headline.trim(),
        bio: values.bio.trim(),
        skills: values.skills.split(",").map((s) => s.trim()).filter(Boolean),
        yearsExperience: values.yearsExperience,
        hourlyRate: values.hourlyRate,
        isAvailable: values.isAvailable,
      });
      await refresh();
      setStatusMessage("Profile saved! Redirecting to assessment...");
      setTimeout(() => {
        router.push("/freelancer/assessment");
      }, 1500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save profile");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFormError("Only JPG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFormError("Image must be smaller than 2MB");
      return;
    }

    setIsUploadingImage(true);
    setFormError(null);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    try {
      const { url } = await uploadProfileImage(file);
      setImagePreview(url);
      setStatusMessage("Profile image updated");
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Image upload failed");
      setImagePreview(user?.photoUrl || null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      setFormError("Only PDF, DOC, and DOCX files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("CV must be smaller than 5MB");
      return;
    }

    setFormError(null);
    setCvFileName(file.name);

    try {
      const { url } = await uploadCv(file);
      setCvUrl(url);
      setStatusMessage("CV uploaded successfully");
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "CV upload failed");
      setCvFileName(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-on-surface-variant">Loading profile...</div>
      </div>
    );
  }

  return (
    <DashboardShell
      role="freelancer"
      title="Freelancer Onboarding"
      subtitle="Complete your profile to get matched with projects."
    >
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 md:p-8 card-shadow">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary-container flex items-center justify-center text-3xl font-bold text-on-primary overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  user?.firstName?.[0] || "?"
                )}
              </div>
              {isUploadingImage && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 cursor-pointer bg-primary-container text-on-primary rounded-full p-1.5 shadow-sm hover:bg-primary transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                />
                <User size={14} />
              </label>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-on-surface-variant">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Headline"
              placeholder="e.g., Full Stack Developer specializing in React and Node.js"
              {...register("headline")}
              error={errors.headline?.message}
            />

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                Bio
              </label>
              <textarea
                {...register("bio")}
                rows={4}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface placeholder:text-outline/50 focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container transition"
                placeholder="Tell us about your experience, skills, and what you enjoy working on..."
              />
              {errors.bio && <p className="mt-1 text-sm text-error">{errors.bio.message}</p>}
            </div>

            <Input
              label="Skills (comma separated)"
              placeholder="React, Node.js, TypeScript, PostgreSQL"
              {...register("skills")}
              error={errors.skills?.message}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Years of Experience"
                type="number"
                placeholder="0"
                {...register("yearsExperience", { valueAsNumber: true })}
                error={errors.yearsExperience?.message}
              />
              <Input
                label="Hourly Rate (EGP)"
                type="number"
                placeholder="250"
                {...register("hourlyRate", { valueAsNumber: true })}
                error={errors.hourlyRate?.message}
              />
            </div>

            <div className="flex items-center gap-3">
              <Controller
                name="isAvailable"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      field.value ? "bg-primary-container" : "bg-surface-container-high"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        field.value ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                )}
              />
              <span className="text-sm text-on-surface-variant">Available for work</span>
            </div>

            {/* CV Upload */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                CV / Resume
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  id="cv-upload"
                  onChange={handleCVUpload}
                />
                <label
                  htmlFor="cv-upload"
                  className="cursor-pointer flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <Upload size={16} />
                  Upload CV
                </label>
                {cvFileName && (
                  <span className="text-sm text-on-surface-variant">{cvFileName}</span>
                )}
                {cvUrl && (
                  <a
                    href={cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-container hover:underline"
                  >
                    View CV
                  </a>
                )}
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">Accepted: PDF, DOC, DOCX (max 5MB)</p>
            </div>

            {formError && <p className="text-sm text-error">{formError}</p>}
            {statusMessage && <p className="text-sm text-primary-container">{statusMessage}</p>}

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!isDirty || isSubmitting}
                className="flex items-center gap-2"
              >
                Save & Continue
                <ChevronRight size={18} />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}