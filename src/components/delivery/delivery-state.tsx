import { clsx } from "clsx";
import { AlertTriangle, Inbox, RotateCw } from "lucide-react";

/**
 * Shared empty / loading / error / retry surfaces for the delivery pages.
 *
 * The Sprint 5 contract requires failed and retryable work to be visibly
 * flagged rather than silently mocked, so these are part of the shared kit
 * instead of being re-invented per page.
 */

export function DeliveryLoading({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "flex items-center justify-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-10 text-sm text-on-surface-variant",
        className,
      )}
    >
      <RotateCw size={16} className="animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function DeliveryEmpty({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-lowest p-10 text-center",
        className,
      )}
    >
      <Inbox size={22} className="text-outline" aria-hidden />
      <p className="font-medium text-on-surface">{title}</p>
      {description && (
        <p className="max-w-md text-sm text-on-surface-variant">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function DeliveryError({
  title = "Could not load this section",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={clsx(
        "rounded-xl border border-error/30 bg-error/5 p-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-error" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium text-on-surface">{title}</p>
          {message && <p className="mt-1 text-sm text-on-surface-variant">{message}</p>}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 px-3 py-1.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <RotateCw size={14} aria-hidden />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * For work that failed upstream but is retryable — a failed AI evaluation, a
 * GitHub invite that did not go through. Distinct from DeliveryError, which is
 * about the page failing to load.
 */
export function DeliveryRetryBanner({
  title,
  message,
  actionLabel = "Retry",
  onAction,
  busy = false,
  className,
}: {
  title: string;
  message?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/40 bg-secondary-container/10 px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-secondary" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-on-surface">{title}</p>
          {message && <p className="text-sm text-on-surface-variant">{message}</p>}
        </div>
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-surface-container-high px-3 py-1.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <RotateCw size={14} className={clsx(busy && "animate-spin")} aria-hidden />
          {busy ? "Working..." : actionLabel}
        </button>
      )}
    </div>
  );
}
