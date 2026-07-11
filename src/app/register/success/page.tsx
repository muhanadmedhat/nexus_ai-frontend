import { EmailVerificationPanel } from "@/components/auth/email-verification-panel";

export default function RegisterSuccessPage() {
  return (
    <EmailVerificationPanel
      title="Verify your email"
      description="Send a verification code to your email, then enter the 6-digit code to unlock project actions."
    />
  );
}
