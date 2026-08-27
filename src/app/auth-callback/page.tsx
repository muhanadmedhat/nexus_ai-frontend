"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { exchangeAuthCode, getMe } from "@/services/auth";
import { DASHBOARD_BY_ROLE } from "@/types/auth";
import type { AuthUser } from "@/types/auth";
import { Loader2 } from "lucide-react";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function getMeWithRetry(): Promise<AuthUser | null> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const user = await getMe();
      if (user) return user;
    } catch (error) {
      lastError = error;
    }

    await wait(250 + attempt * 250);
  }

  if (lastError) throw lastError;
  return null;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const hasExchangedRef = useRef(false);
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    async function completeAuth() {
      if (hasExchangedRef.current) return;
      hasExchangedRef.current = true;

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const search = new URLSearchParams(window.location.search);
      const error = search.get("error");
      const code = search.get("code") ?? hash.get("code");

      window.history.replaceState(null, "", "/auth-callback");

      if (error || !code) {
        setMessage(
          error === "access_denied"
            ? "Google sign in was cancelled. Please try again."
            : "Google sign in failed. Please try again.",
        );
        return;
      }

      try {
        setMessage("Securing your session...");
        const exchange = await exchangeAuthCode(code);
        setMessage("Loading your account...");
        const user = await getMeWithRetry();
        await refresh();

        if (!user) {
          setMessage("We could not load your account yet. Please refresh and try again.");
          return;
        }

        if (!exchange.isProfileComplete) {
          setMessage("Almost done. Redirecting...");
          router.replace("/complete-profile");
          return;
        }

        setMessage("Signed in. Redirecting...");
        router.replace(DASHBOARD_BY_ROLE[user.role]);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Sign in failed. Please try again.");
      }
    }

    void completeAuth();

  }, [refresh, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 text-center">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-8 py-7 card-shadow">
        <Loader2 className="h-6 w-6 animate-spin text-primary-container" />
        <p className="text-sm text-on-surface-variant">{message}</p>
      </div>
    </main>
  );
}
