"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { sendPhoneVerification, verifyPhone } from "@/services/auth";
import { DASHBOARD_BY_ROLE } from "@/types/auth";

export default function PhoneNotVerifiedPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.isPhoneVerified) {
      router.replace(DASHBOARD_BY_ROLE[user.role]);
    }
  }, [loading, router, user]);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const result = await sendPhoneVerification();
      setSent(true);
      setMessage(
        result.testMode
          ? "A development verification code is configured on the server."
          : `We sent an SMS to ${user?.phoneNumber ?? "your phone"}. The code expires in 10 minutes.`,
      );
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send the code",
      );
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (!/^\d{4,10}$/.test(code)) {
      setError("Enter the numeric code from the SMS.");
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await verifyPhone(code);
      await refresh();
      if (user) router.replace(DASHBOARD_BY_ROLE[user.role]);
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Verification failed",
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-md rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-7 card-shadow">
        <Logo className="text-xl" />
        <h1 className="mt-8 font-headline text-2xl font-semibold text-on-surface">
          Verify your phone
        </h1>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          We verify one phone number per account before project work and
          invitations become available.
        </p>
        <div className="mt-6 space-y-4">
          <Button
            type="button"
            variant="outline"
            loading={sending}
            onClick={() => void send()}
          >
            {sent ? "Send a new code" : "Send verification code"}
          </Button>
          <Input
            label="Verification code"
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 10))
            }
          />
          {message && (
            <p className="text-sm text-on-surface-variant">{message}</p>
          )}
          {error && <p className="text-sm text-error">{error}</p>}
          <Button
            type="button"
            loading={verifying}
            disabled={!sent}
            onClick={() => void verify()}
          >
            Verify and continue
          </Button>
        </div>
      </section>
    </main>
  );
}
