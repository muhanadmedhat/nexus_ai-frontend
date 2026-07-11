"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthVisualPanel } from "@/components/layout/auth-visual-panel";
import { useAuth } from "@/hooks/use-auth";
import { getMe, signIn } from "@/services/auth";
import { DASHBOARD_BY_ROLE } from "@/types/auth";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      const me = await getMe();
      await refresh();

      // Check if email is verified
      if (me && !me.isEmailVerified) {
        router.replace("/email-not-verified");
        return;
      }

      router.replace(me ? DASHBOARD_BY_ROLE[me.role] : "/login");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Invalid email or password");
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col bg-[#f5f5f0] lg:h-screen lg:overflow-hidden lg:flex-row">
      <AuthVisualPanel
        imageSrc="/auth-panel-nexus.png"
        alt="AI project workspace"
        title={
          <>
            From messy briefs
            <br />
            to verified delivery.
          </>
        }
        description={
          <>
            AI agents structure requirements, match freelancers to tasks, evaluate submissions,
            and support escrow release.
          </>
        }
      />

      <section className="flex flex-1 flex-col items-center justify-center bg-surface p-8 md:p-12 lg:h-screen lg:overflow-hidden lg:p-12">
        <div className="w-full max-w-[448px]">
          <div className="mb-10">
            <h1 className="mb-4 font-headline text-4xl font-bold leading-tight tracking-tight text-on-surface md:text-5xl">
              Welcome back
            </h1>
            <p className="max-w-sm text-lg text-on-surface-variant">
              Sign in to continue managing your projects with precision.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
            <Input
              label="Email Address"
              uppercaseLabel
              type="email"
              placeholder="name@company.com"
              icon={<Mail size={20} className="text-outline" />}
              {...register("email")}
              error={errors.email?.message}
            />
            <Input
              label="Password"
              uppercaseLabel
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              icon={<Lock size={20} className="text-outline" />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-outline transition-colors hover:text-on-surface"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
              labelExtra={
                <Link
                  href="#"
                  className="text-xs font-semibold text-primary-container hover:underline"
                >
                  Forgot password?
                </Link>
              }
              {...register("password")}
              error={errors.password?.message}
            />

            {formError && <p className="text-sm text-error">{formError}</p>}

            <Button type="submit" loading={isSubmitting}>
              Sign in
            </Button>
          </form>

          {/* 🔴 NEW: Google OAuth Button */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-4 text-on-surface-variant">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              // TODO: Implement with Supabase OAuth
              // const { error } = await supabase.auth.signInWithOAuth({
              //   provider: "google",
              //   options: { redirectTo: `${window.location.origin}/auth/callback` },
              // });
              // if (error) console.error(error);
            }}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="mt-8 text-center text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-bold text-primary-container hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}