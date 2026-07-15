"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { getFreelancerAccount, createFreelancerOnboardingLink } from "@/services/payments";

export default function FreelancerPaymentsPage() {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFreelancerAccount()
      .then(setAccount)
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  }, []);

  const handleOnboard = async () => {
    try {
      const res = await createFreelancerOnboardingLink({
        refreshUrl: window.location.href,
        returnUrl: window.location.href
      });
      window.location.href = res.onboardingUrl;
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardShell role="freelancer" title="Payments & Onboarding" subtitle="Connect your Stripe account to receive payouts.">
      {loading ? (
        <p className="text-sm">Loading...</p>
      ) : account?.stripeOnboardingStatus === "completed" ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow">
          <h3 className="font-headline font-semibold text-on-surface">Stripe Account Linked</h3>
          <p className="mt-1 text-sm text-on-surface-variant">You are ready to receive payouts securely.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow max-w-lg">
          <h3 className="font-headline text-lg font-semibold text-on-surface">Connect with Stripe</h3>
          <p className="mt-1 text-sm text-on-surface-variant mb-6">You need to set up your Stripe Connect account to accept payments from customers.</p>
          <Button onClick={handleOnboard} className="w-full">
            <Link2 size={16} className="mr-2" /> Complete Onboarding
          </Button>
        </div>
      )}
    </DashboardShell>
  );
}
