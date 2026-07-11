import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "outline";
}

export function Button({
  loading,
  disabled,
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-lg py-3.5 font-headline font-semibold shadow-sm transition-all active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-primary-container text-on-primary hover:bg-primary"
          : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
        className,
      )}
      {...props}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
