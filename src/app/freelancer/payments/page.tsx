"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/utils/format";
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

const wait = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export default function FreelancerPaymentsPage() {
  const [account, setAccount] = useState<FreelancerAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingStripeReturn, setRefreshingStripeReturn] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [country, setCountry] = useState("US");
  const toast = useToast();

  const loadAccount = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const nextAccount = await getFreelancerAccount();
      setAccount(nextAccount);
      return nextAccount;
    } catch {
      setAccount(null);
      return null;
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadAccount());
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

  const refreshAfterStripeReturn = useCallback(
    async (stripeState: string) => {
      setRefreshingStripeReturn(true);
      try {
        let latestAccount: FreelancerAccountStatus | null = null;

        for (let attempt = 0; attempt < 5; attempt += 1) {
          latestAccount = await loadAccount(false);
          if (
            latestAccount?.stripeOnboardingStatus === "completed" ||
            latestAccount?.stripeAccountId
          ) {
            break;
          }
          await wait(1200);
        }

        if (stripeState === "return") {
          if (latestAccount?.stripeOnboardingStatus === "completed") {
            toast.success(
              "Stripe account linked",
              "Your payouts are ready. You can manage the account from here.",
            );
          } else if (latestAccount?.stripeAccountId) {
            toast.success(
              "Stripe account connected",
              "Finish any remaining Stripe requirements to unlock payouts.",
            );
          } else {
            toast.error(
              "Stripe status still pending",
              "Stripe has not returned an account yet. Try opening onboarding again.",
            );
          }
        }

        if (stripeState === "refresh") {
          toast.error(
            "Stripe link expired",
            "Open onboarding again to continue.",
          );
        }
      } finally {
        setRefreshingStripeReturn(false);
        window.history.replaceState(null, "", window.location.pathname);
      }
    },
    [loadAccount, toast],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeState = params.get("stripe");
    if (!stripeState) return;

    void Promise.resolve().then(() => refreshAfterStripeReturn(stripeState));
  }, [refreshAfterStripeReturn]);

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
        err instanceof Error ? err.message : "Could not open Stripe Dashboard.";
      toast.error("Stripe Dashboard unavailable", message);
      setOpeningDashboard(false);
    }
  };

  const hasStripeAccount = Boolean(account?.stripeAccountId);
  const buttonLabel = hasStripeAccount
    ? "Continue Onboarding"
    : "Set Up Payouts";

  return (
    <DashboardShell
      role="freelancer"
      title="Payments & Onboarding"
      subtitle="Connect your Stripe account to receive payouts."
    >
      {loading || refreshingStripeReturn ? (
        <p className="text-sm text-on-surface-variant">
          {refreshingStripeReturn
            ? "Checking your Stripe account..."
            : "Loading..."}
        </p>
      ) : (
        <div className="space-y-5">
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              Your earnings
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Task allocations are reserved in the approved plan. An
              admin-approved submission moves its task amount into approved
              earnings; escrow release remains a separate step.
            </p>
            {account?.earnings.currencies.length ? (
              <div className="mt-5 space-y-5">
                {account.earnings.currencies.map((earnings) => (
                  <div key={earnings.currency}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-container">
                      {earnings.currency}
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        ["Allocated work", earnings.allocatedAmount],
                        ["Approved earnings", earnings.approvedAmount],
                        ["Pending release", earnings.pendingReleaseAmount],
                        ["Released ledger", earnings.releasedAmount],
                      ].map(([label, amount]) => (
                        <div
                          key={String(label)}
                          className="rounded-lg bg-surface-container-low p-4"
                        >
                          <dt className="text-xs text-on-surface-variant">
                            {label}
                          </dt>
                          <dd className="mt-1 text-lg font-semibold text-on-surface">
                            {formatMoney(Number(amount), earnings.currency)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
                No task compensation has been allocated to you yet.
              </p>
            )}
            <p className="mt-4 text-xs leading-5 text-on-surface-variant">
              Approved earnings are recorded even if the client has not funded
              enough escrow. Only released amounts have completed the internal
              release ledger; Stripe onboarding controls external payouts.
            </p>
          </section>

          {account?.stripeOnboardingStatus === "completed" ? (
            <div className="max-w-xl rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
              <h3 className="font-headline font-semibold text-on-surface">
                Stripe Account Linked
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                You are ready to receive payouts securely. Open Stripe to manage
                bank details, verification, and payout settings.
              </p>
              <Button
                type="button"
                onClick={handleManageAccount}
                className="mt-6 w-full"
                disabled={openingDashboard}
              >
                <ExternalLink size={16} className="mr-2" />
                {openingDashboard
                  ? "Opening Stripe..."
                  : "Manage Stripe Account"}
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow max-w-lg">
              <h3 className="font-headline text-lg font-semibold text-on-surface">
                Connect with Stripe
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Choose your payout country, then Stripe will securely collect
                bank details and any required identity verification.
              </p>
              <label
                className="mt-6 block text-sm font-medium text-on-surface"
                htmlFor="payout-country"
              >
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
                  Stripe account connected. Country is locked after Stripe
                  creates the payout account.
                </p>
              )}
              <Button
                onClick={handleOnboard}
                className="mt-6 w-full"
                disabled={connecting}
              >
                <Link2 size={16} className="mr-2" />
                {connecting ? "Opening Stripe..." : buttonLabel}
              </Button>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
