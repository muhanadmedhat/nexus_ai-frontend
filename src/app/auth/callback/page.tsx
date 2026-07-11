"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/services/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const user = await getMe();
        if (!user) {
          setError("Failed to get user after OAuth");
          return;
        }

        // If user has no profile (OAuth first-time user), redirect to complete-profile
        if (!user.firstName || !user.lastName) {
          router.replace("/complete-profile");
          return;
        }

        router.replace(`/dashboard/${user.role}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-error">Error: {error}</p>
          <button
            onClick={() => router.replace("/login")}
            className="mt-4 text-primary-container hover:underline"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-on-surface-variant">Completing sign in...</p>
      </div>
    </div>
  );
}