"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { resendVerificationEmail, verifyEmail } from "@/services/auth";
import { DASHBOARD_BY_ROLE } from "@/types/auth";
import { useToast } from "@/components/ui/toast";

interface EmailVerificationPanelProps {
  title: string;
  description: string;
}

export function EmailVerificationPanel({
  title,
  description,
}: EmailVerificationPanelProps) {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendCode = async () => {
    setSending(true);
    try {
      await resendVerificationEmail();
      toast.success("Verification code sent", "Check your email inbox.");
    } catch (err) {
      toast.error(
        "Could not send code",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const submitCode = async () => {
    const nextCode = code.trim();
    if (!nextCode) return;

    setVerifying(true);
    try {
      await verifyEmail(nextCode);
      await refresh();
      toast.success("Email verified");
      router.replace(user ? DASHBOARD_BY_ROLE[user.role] : "/login");
    } catch (err) {
      toast.error(
        "Could not verify code",
        err instanceof Error ? err.message : "Please check the code and try again.",
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <section className="w-full max-w-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
        <h1 className="font-headline text-2xl font-semibold text-on-surface">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>

        <div className="mt-6 space-y-3">
          <Button type="button" variant="outline" loading={sending} onClick={sendCode}>
            Send verification code
          </Button>

          <div className="space-y-2">
            <label htmlFor="verification-code" className="text-sm font-medium text-on-surface">
              Verification code
            </label>
            <input
              id="verification-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              maxLength={6}
              className="input-halo w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-all placeholder:text-outline/50"
              placeholder="123456"
            />
          </div>

          <Button type="button" loading={verifying} disabled={code.trim().length !== 6} onClick={submitCode}>
            Verify email
          </Button>
        </div>
      </section>
    </main>
  );
}
