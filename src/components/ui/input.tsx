import { forwardRef } from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  labelExtra?: React.ReactNode;
  uppercaseLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, trailing, labelExtra, uppercaseLabel, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className={clsx(
              "block",
              uppercaseLabel
                ? "text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                : "text-sm font-medium text-on-surface",
            )}
          >
            {label}
          </label>
          {labelExtra}
        </div>
        <div className="input-halo flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 transition-all">
          {icon}
          <input
            id={inputId}
            ref={ref}
            className={clsx(
              "w-full bg-transparent py-3 text-on-surface outline-none placeholder:text-outline/50",
              className,
            )}
            {...props}
          />
          {trailing}
        </div>
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    );
  },
);

Input.displayName = "Input";
