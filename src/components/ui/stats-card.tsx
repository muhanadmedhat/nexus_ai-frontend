import { clsx } from "clsx";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

export function StatsCard({ label, value, icon, trend, className }: StatsCardProps) {
  return (
    <div className={clsx(
      "rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 card-shadow",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-on-surface-variant">{label}</p>
          <p className="mt-1 text-2xl font-bold text-on-surface">{value}</p>
          {trend && (
            <p className={clsx(
              "mt-1 text-xs font-medium",
              trend.positive ? "text-primary-container" : "text-error"
            )}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-surface-container-high p-2.5 text-outline">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}