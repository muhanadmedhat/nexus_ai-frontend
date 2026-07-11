"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";

interface ProfileCardProps {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  photoUrl: string | null;
  initials: string;
  isUploading: boolean;
  onFileSelect: (file: File) => void;
  uploadError?: string | null;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    event.target.value = "";
  };

  const roleDisplay = {
    customer: "Client",
    freelancer: "Freelancer",
    admin: "Admin",
  }[role] || role;

  return (
    <div className="group relative w-80 h-80 bg-surface-container-lowest rounded-[32px] p-[3px] shadow-[0px_70px_30px_-50px_rgba(96,75,74,0.19)] transition-all duration-500 ease-in-out hover:rounded-tl-[55px]">
      
      {/* Mail icon (optional) */}
      <button className="absolute right-8 top-5 z-10 bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fbb9b6" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="hover:stroke-error transition-colors">
          <rect width={20} height={16} x={2} y={4} rx={2} />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </button>

      {/* Profile Picture - expands/shrinks on hover */}
      <div className="absolute inset-[3px] rounded-[29px] z-10 border-0 border-primary-container/30 overflow-hidden transition-all duration-500 ease-in-out delay-200 group-hover:w-[100px] group-hover:h-[100px] group-hover:aspect-square group-hover:top-[10px] group-hover:left-[10px] group-hover:rounded-full group-hover:border-[7px] group-hover:border-primary-container/30 group-hover:shadow-[0px_5px_5px_0px_rgba(96,75,74,0.19)] group-hover:z-30">
        
        {/* Photo or initials */}
        <div className="w-full h-full flex items-center justify-center bg-primary-container/10 text-6xl font-bold text-primary-container transition-all duration-500 ease-in-out group-hover:scale-[2.5] group-hover:object-[0px_25px]">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Profile"
              className="w-full h-full object-cover transition-all duration-500 ease-in-out delay-500 group-hover:scale-[2.5] group-hover:object-[0px_25px]"
            />
          ) : (
            <span className="transition-all duration-500 ease-in-out delay-500 group-hover:scale-[2.5]">{initials}</span>
          )}
        </div>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}

        {/* Camera icon - visible on hover */}
        <label
          htmlFor="profile-image-upload"
          className="absolute bottom-2 right-2 cursor-pointer rounded-full bg-primary-container p-1.5 text-on-primary shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-10"
        >
          <Camera size={16} />
        </label>
        <input
          id="profile-image-upload"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>

      {/* Bottom section - expands on hover */}
      <div className="absolute bottom-[3px] left-[3px] right-[3px] bg-primary-container/20 top-[80%] rounded-[29px] z-20 shadow-[0px_5px_5px_0px_rgba(96,75,74,0.19)] inset overflow-hidden transition-all duration-500 cubic-bezier(0.645, 0.045, 0.355, 1) group-hover:top-[20%] group-hover:rounded-[80px_29px_29px_29px]">
        
        {/* Content */}
        <div className="absolute bottom-0 left-6 right-6 h-40">
          <span className="block text-xl font-bold text-on-surface">
            {firstName} {lastName}
          </span>
          <span className="block text-sm text-on-surface-variant mt-4">
            {roleDisplay}
          </span>
          <span className="block text-xs text-on-surface-variant/60 mt-1">
            {email}
          </span>
        </div>

        {/* Bottom section with social links */}
        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
          <div className="flex gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" className="h-5 fill-primary-container hover:fill-primary cursor-pointer transition-transform hover:scale-110">
              <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8z" />
            </svg>
          </div>
          <button className="bg-surface-container-lowest text-primary-container border-none rounded-3xl text-xs px-3 py-1.5 shadow-[0px_5px_5px_0px_rgba(165,132,130,0.13)] hover:bg-primary-container hover:text-on-primary transition-colors">
            Contact Me
          </button>
        </div>
      </div>

      {uploadError && (
        <p className="absolute -bottom-7 left-0 text-xs text-error">{uploadError}</p>
      )}
    </div>
  );
}