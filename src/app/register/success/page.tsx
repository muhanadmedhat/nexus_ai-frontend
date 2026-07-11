"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";

export default function RegisterSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <Logo className="mb-8 justify-center text-2xl" />
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container/20">
          <CheckCircle size={32} className="text-primary-container" />
        </div>
        <h1 className="mb-2 font-headline text-2xl font-bold text-on-surface">
          Check your email
        </h1>
        <p className="text-on-surface-variant">
          We've sent a verification link to your email address.
          Please verify your account before continuing.
        </p>
        <Link href="/login">
          <Button className="mt-6 w-full">
            Go to login
          </Button>
        </Link>
        <p className="mt-4 text-sm text-on-surface-variant">
          Didn't receive the email?{" "}
          <button className="font-medium text-primary-container hover:underline">
            Resend verification
          </button>
        </p>
      </div>
    </div>
  );
}