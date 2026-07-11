import { EmailVerificationPanel } from "@/components/auth/email-verification-panel";

export default function EmailNotVerifiedPage() {
  return (
    <EmailVerificationPanel
      title="Email verification required"
      description="Your account is signed in, but the backend requires email verification before project and freelancer actions."
    />
  );
}
