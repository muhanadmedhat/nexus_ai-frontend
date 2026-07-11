"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { exchangeAuthCode, getMe } from "@/services/auth";
import { DASHBOARD_BY_ROLE } from "@/types/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const hasExchangedRef = useRef(false);
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    let active = true;

    async function completeAuth() {
      if (hasExchangedRef.current) return;
      hasExchangedRef.current = true;

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const search = new URLSearchParams(window.location.search);
      const error = search.get("error");
      const code = search.get("code") ?? hash.get("code");

      window.history.replaceState(null, "", "/auth-callback");

      if (error || !code) {
        if (active) setMessage("Sign in failed. Please try again.");
        return;
      }

      try {
        const exchange = await exchangeAuthCode(code);
        const user = await getMe();
        await refresh();

        if (!active) return;

        if (!exchange.isProfileComplete) {
          setMessage("Almost done. Redirecting...");
          router.replace("/complete-profile");
          return;
        }

        setMessage("Signed in. Redirecting...");
        router.replace(user ? DASHBOARD_BY_ROLE[user.role] : "/login");
      } catch (err) {
        if (active) {
          setMessage(err instanceof Error ? err.message : "Sign in failed. Please try again.");
        }
      }
    }

    void completeAuth();

    return () => {
      active = false;
    };
  }, [refresh, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 text-center">
      <p className="text-sm text-on-surface-variant">{message}</p>
    </main>
  );
}
