"use client";

import Image from "next/image";
import Spline from "@splinetool/react-spline";

interface AuthVisualPanelProps {
  imageSrc?: string;
  sceneUrl?: string;
  alt: string;
  title: React.ReactNode;
  description: React.ReactNode;
}

export function AuthVisualPanel({
  imageSrc,
  sceneUrl,
  alt,
  title,
  description,
}: AuthVisualPanelProps) {
  return (
    <section
      className="relative hidden h-screen w-1/2 overflow-hidden rounded-r-3xl bg-[#174332] lg:flex"
      aria-label={alt}
    >
      <style>
        {`
          .spline-watermark,
          [data-spline-watermark],
          [class*="spline-watermark"],
          .spline-viewer .watermark,
          a[href*="spline.design"],
          a[href*="spline"],
          div[style*="Made with Spline"],
          canvas + div[style*="position: absolute"] {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }

          @keyframes auth-robot-float {
            0%, 100% {
              transform: translate3d(0, 0, 0) rotate(0deg);
            }
            25% {
              transform: translate3d(18px, -14px, 0) rotate(0.6deg);
            }
            50% {
              transform: translate3d(-12px, 10px, 0) rotate(-0.4deg);
            }
            75% {
              transform: translate3d(10px, 16px, 0) rotate(0.35deg);
            }
          }

          .auth-robot-float {
            animation: auth-robot-float 12s ease-in-out infinite;
            will-change: transform;
          }

          .auth-robot-shell:hover .auth-robot-float,
          .auth-robot-shell:active .auth-robot-float {
            animation-play-state: paused;
          }

          @media (prefers-reduced-motion: reduce) {
            .auth-robot-float {
              animation: none;
            }
          }
        `}
      </style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_28%,rgba(198,163,100,0.24),transparent_34%),linear-gradient(145deg,#123529_0%,#1e5a43_52%,#123529_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b241b] via-[#123529]/80 to-transparent" />

      {imageSrc && !sceneUrl && (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          priority
          className="object-cover opacity-75"
          sizes="50vw"
        />
      )}

      {sceneUrl && (
        <div className="auth-robot-shell absolute left-1/2 top-1/2 z-[3] h-[60vh] w-[82%] max-w-[660px] -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing">
          <div className="auth-robot-float relative h-full w-full overflow-hidden opacity-95">
            <Spline scene={sceneUrl} className="h-full w-full" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-0 h-32 w-72 bg-gradient-to-br from-[#1e5a43]/90 via-[#174332] to-[#123529]"
            />
          </div>
        </div>
      )}

      {sceneUrl && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[17%] right-[7%] z-[6] h-24 w-72 bg-gradient-to-br from-[#1e5a43]/95 via-[#174332] to-[#123529]"
        />
      )}

      <div className="absolute left-8 top-8 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-white shadow-sm backdrop-blur-md">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M4 5l6 7-6 7M12 5l6 7-6 7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
        </svg>
        <span className="font-headline text-sm font-bold">Nexus AI</span>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-end p-10">
        <h2 className="mb-3 max-w-md font-headline text-4xl font-bold leading-tight text-white">
          {title}
        </h2>
        <p className="max-w-sm text-sm leading-6 text-white/80">
          {description}
        </p>
      </div>
    </section>
  );
}
