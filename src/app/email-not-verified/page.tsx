"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Mail } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

export default function EmailNotVerifiedPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async () => {
    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);
    try {
      // TODO: Replace with real endpoint when available
      // await api.post("/auth/resend-verification");
      // For now, simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setResendSuccess(true);
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Failed to resend verification");
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <Logo className="mb-8 justify-center text-2xl" />
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-container/20">
          <AlertCircle size={32} className="text-error" />
        </div>
        <h1 className="mb-2 font-headline text-2xl font-bold text-on-surface">
          Email not verified
        </h1>
        <p className="text-on-surface-variant">
          Please verify your email address before continuing.
          Check your inbox for the verification link.
        </p>

        {resendSuccess && (
          <div className="mt-4 rounded-lg bg-primary-container/10 p-3 text-sm text-primary-container">
            <Mail size={16} className="mr-2 inline" />
            Verification email sent! Please check your inbox.
          </div>
        )}

        {resendError && (
          <div className="mt-4 rounded-lg bg-error-container/10 p-3 text-sm text-error">
            {resendError}
          </div>
        )}

        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={handleResend}
          loading={isResending}
        >
          Resend verification email
        </Button>

        <button
          onClick={handleSignOut}
          className="mt-4 text-sm text-on-surface-variant hover:underline"
        >
          Sign out and try again
        </button>
      </div>
    </div>
  );
}