"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Spline from "@splinetool/react-spline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useAuth } from "@/hooks/use-auth";
import { getMe, signIn } from "@/services/auth";
import { DASHBOARD_BY_ROLE } from "@/types/auth";
import { useToast } from "@/components/ui/toast";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await signIn(values.email, values.password);
      const me = await getMe();
      await refresh();
      toast.success("Signed in", "Welcome back.");

      if (me && !me.isEmailVerified) {
        router.replace("/email-not-verified");
        return;
      }

      router.replace(me ? DASHBOARD_BY_ROLE[me.role] : "/login");
    } catch (err) {
      toast.error(
        "Sign in failed",
        err instanceof Error ? err.message : "Invalid email or password",
      );
    }
  };

  return (
    <>
      {/* Hide Spline watermark */}
      <style>
        {`
          .spline-watermark,
          [data-spline-watermark],
          [class*="spline-watermark"],
          .spline-viewer .watermark,
          canvas + div[style*="position: absolute"] {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }

          @font-face {
            font-family: 'Rocher';
            src: url(https://assets.codepen.io/9632/RocherColorGX.woff2);
          }

          .title-wrapper {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 0.1em;
            z-index: 10;
            font-size: clamp(3rem, 8vw, 7rem);
            line-height: 1;
            padding-top: 8vh;
            margin-bottom: 1rem;
          }

          .title-nexus,
          .title-ai {
            font-family: 'Rocher', sans-serif;
            color: #324933;
          }

          .title-wrapper span {
            display: inline-block;
          }
        `}
      </style>

      <main className="flex min-h-screen w-full flex-col bg-[#f5f5f0] lg:h-screen lg:overflow-hidden lg:flex-row">
        {/* Left Panel – Title (top) + Robot (bottom) */}
        <section className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-surface p-8 lg:flex">
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-start">
            <div className="title-wrapper">
              <span className="title-nexus">Nexus</span>
              <span className="title-ai">AI</span>
            </div>

            <div className="w-full flex-1 flex items-center justify-center">
              <Spline
                scene="https://draft.spline.design/joTbeFyFhCIcKsZ1/scene.splinecode"
                className="h-[75vh] w-full"
              />
            </div>
          </div>
        </section>

        {/* Right Panel – Form */}
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
              <Button type="submit" loading={isSubmitting}>
                Sign in
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-4 text-on-surface-variant">Or continue with</span>
              </div>
            </div>

            <GoogleAuthButton />

            <p className="mt-8 text-center text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-bold text-primary-container hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}