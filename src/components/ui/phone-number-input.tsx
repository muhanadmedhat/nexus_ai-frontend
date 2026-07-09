import PhoneInput, { type Country, type Value } from "react-phone-number-input";
import { clsx } from "clsx";

interface PhoneNumberInputProps {
  label: string;
  name: string;
  value?: string;
  error?: string;
  placeholder?: string;
  defaultCountry?: Country;
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
  onChange,
  onBlur,
}: PhoneNumberInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-on-surface">
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
          error && "border-error",
        )}
      />
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
