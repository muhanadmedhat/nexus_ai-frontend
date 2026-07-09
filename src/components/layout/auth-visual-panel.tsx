import Image from "next/image";

interface AuthVisualPanelProps {
  imageSrc: string;
  alt: string;
  title: React.ReactNode;
  description: React.ReactNode;
}

export function AuthVisualPanel({ imageSrc, alt, title, description }: AuthVisualPanelProps) {
  return (
    <section className="relative hidden h-screen w-1/2 overflow-hidden rounded-r-3xl lg:flex">
      <Image src={imageSrc} alt={alt} fill priority className="object-cover" sizes="50vw" />

      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />

      <div className="absolute left-8 top-8 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-white shadow-sm backdrop-blur-md">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M4 5l6 7-6 7M12 5l6 7-6 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-headline text-sm font-bold">Nexus AI</span>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-end p-10">
        <h2 className="mb-3 max-w-md font-headline text-3xl font-bold leading-snug text-white">
          {title}
        </h2>
        <p className="max-w-sm text-sm leading-6 text-white/80">{description}</p>
      </div>
    </section>
  );
}
