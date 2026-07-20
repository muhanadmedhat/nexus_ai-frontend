import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "outline";
  size?: "sm" | "md";
}

export function Button({
  loading,
  disabled,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg font-headline font-semibold shadow-sm transition-all active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "px-3 py-2 text-sm" : "w-full px-4 py-3.5",
        variant === "primary"
          ? "bg-primary-container text-on-primary hover:bg-primary"
          : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
        className,
      )}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
