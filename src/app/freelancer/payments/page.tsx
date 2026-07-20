"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  createFreelancerDashboardLink,
  createFreelancerOnboardingLink,
  getFreelancerAccount,
  type FreelancerAccountStatus,
} from "@/services/payments";

const PAYOUT_COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "NL", label: "Netherlands" },
  { code: "IE", label: "Ireland" },
] as const;

export default function FreelancerPaymentsPage() {
  const [account, setAccount] = useState<FreelancerAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [country, setCountry] = useState("US");
  const toast = useToast();

  const loadAccount = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      setAccount(await getFreelancerAccount());
    } catch {
      setAccount(null);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    const refreshSilently = () => void loadAccount(false);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshSilently();
    };

    window.addEventListener("focus", refreshSilently);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("focus", refreshSilently);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadAccount]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeState = params.get("stripe");
    if (!stripeState) return;

    void loadAccount(false);
    if (stripeState === "return") {
      toast.success("Stripe updated", "Your payout status has been refreshed.");
    }
    if (stripeState === "refresh") {
      toast.error("Stripe link expired", "Open onboarding again to continue.");
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, [loadAccount, toast]);

  const handleOnboard = async () => {
    if (connecting) return;

    setConnecting(true);
    try {
      const returnUrl = `${window.location.origin}/freelancer/payments?stripe=return`;
      const refreshUrl = `${window.location.origin}/freelancer/payments?stripe=refresh`;
      const res = await createFreelancerOnboardingLink({
        refreshUrl,
        returnUrl,
        country,
      });
      if (!res.onboardingUrl) {
        throw new Error("Stripe did not return an onboarding link.");
      }

      window.location.assign(res.onboardingUrl);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not open Stripe onboarding.";
      toast.error("Stripe onboarding failed", message);
      setConnecting(false);
    }
  };

  const handleManageAccount = async () => {
    if (openingDashboard) return;

    setOpeningDashboard(true);
    try {
      const res = await createFreelancerDashboardLink();
      if (!res.url) {
        throw new Error("Stripe did not return a dashboard link.");
      }

      window.location.assign(res.url);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not open Stripe Dashboard.";
      toast.error("Stripe Dashboard unavailable", message);
      setOpeningDashboard(false);
    }
  };

  const hasStripeAccount = Boolean(account?.stripeAccountId);
  const buttonLabel = hasStripeAccount ? "Continue Onboarding" : "Set Up Payouts";

  return (
    <DashboardShell role="freelancer" title="Payments & Onboarding" subtitle="Connect your Stripe account to receive payouts.">
      {loading ? (
        <p className="text-sm">Loading...</p>
      ) : account?.stripeOnboardingStatus === "completed" ? (
        <div className="max-w-xl rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
          <h3 className="font-headline font-semibold text-on-surface">Stripe Account Linked</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            You are ready to receive payouts securely. Open Stripe to manage bank details, verification, and payout settings.
          </p>
          <Button
            type="button"
            onClick={handleManageAccount}
            className="mt-6 w-full"
            disabled={openingDashboard}
          >
            <ExternalLink size={16} className="mr-2" />
            {openingDashboard ? "Opening Stripe..." : "Manage Stripe Account"}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow max-w-lg">
          <h3 className="font-headline text-lg font-semibold text-on-surface">Connect with Stripe</h3>
          <p className="mt-1 text-sm text-on-surface-variant">Choose your payout country, then Stripe will securely collect bank details and any required identity verification.</p>
          <label className="mt-6 block text-sm font-medium text-on-surface" htmlFor="payout-country">
            Payout country
          </label>
          <select
            id="payout-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            disabled={hasStripeAccount || connecting}
            className="mt-2 h-11 w-full rounded-md border border-outline-variant/70 bg-surface px-3 text-sm text-on-surface outline-none transition focus:border-primary"
          >
            {PAYOUT_COUNTRIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          {hasStripeAccount && (
            <p className="mt-2 text-xs text-on-surface-variant">
              Country is locked after Stripe creates the payout account.
            </p>
          )}
          <Button onClick={handleOnboard} className="mt-6 w-full" disabled={connecting}>
            <Link2 size={16} className="mr-2" />
            {connecting ? "Opening Stripe..." : buttonLabel}
          </Button>
        </div>
      )}
    </DashboardShell>
  );
}
