"use client";

import { useRef } from "react";
import { Camera, Loader2 } from "lucide-react";

interface ProfileCardProps {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  photoUrl: string | null;
  initials: string;
  isUploading: boolean;
  onFileSelect: (file: File) => void;
  uploadError: string | null;
}

export function ProfileCard({
  firstName,
  lastName,
  role,
  email,
  photoUrl,
  initials,
  isUploading,
  onFileSelect,
  uploadError,
}: ProfileCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fullName = `${firstName} ${lastName}`.trim() || "Profile";

  return (
    <section className="w-full max-w-2xl rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <div className="relative">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-primary-container text-3xl font-bold text-on-primary">
            {photoUrl ? (
              <span
                aria-label={`${fullName} profile photo`}
                role="img"
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${photoUrl})` }}
              />
            ) : (
              initials
            )}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-lowest text-primary-container shadow-sm transition-colors hover:bg-surface-container-low disabled:opacity-60"
            aria-label="Upload profile photo"
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFileSelect(file);
              event.currentTarget.value = "";
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-headline text-2xl font-semibold text-on-surface">{fullName}</p>
          <p className="mt-1 text-sm capitalize text-primary-container">{role}</p>
          <p className="mt-2 break-all text-sm text-on-surface-variant">{email}</p>
          {uploadError && <p className="mt-3 text-sm text-error">{uploadError}</p>}
        </div>
      </div>
    </section>
  );
}
