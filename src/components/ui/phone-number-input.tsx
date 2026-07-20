import PhoneInput, { type Country, type Value } from "react-phone-number-input";
import { clsx } from "clsx";

interface PhoneNumberInputProps {
  label: string;
  name: string;
  value?: string;
  error?: string;
  placeholder?: string;
  defaultCountry?: Country;
  compact?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export function PhoneNumberInput({
  label,
  name,
  value,
  error,
  placeholder = "Phone number",
  defaultCountry = "EG",
  compact = false,
  onChange,
  onBlur,
}: PhoneNumberInputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className={clsx(
          "block font-medium text-on-surface",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {label}
      </label>
      <PhoneInput
        id={name}
        name={name}
        value={value as Value | undefined}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        onBlur={onBlur}
        defaultCountry={defaultCountry}
        international
        countryCallingCodeEditable={false}
        placeholder={placeholder}
        className={clsx(
          "phone-number-input input-halo rounded-lg border border-outline-variant bg-surface-container-lowest px-4 transition-all",
          compact && "phone-number-input-compact px-3",
          error && "border-error",
        )}
      />
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
