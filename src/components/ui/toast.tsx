"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { clsx } from "clsx";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let toastId = 0;

const TOAST_STYLES: Record<
  ToastVariant,
  { icon: ReactNode; className: string; iconClassName: string }
> = {
  success: {
    icon: <CheckCircle2 size={18} />,
    className: "border-primary-container/20 bg-primary-container text-on-primary",
    iconClassName: "text-on-primary",
  },
  error: {
    icon: <AlertCircle size={18} />,
    className: "border-error/20 bg-error text-on-error",
    iconClassName: "text-on-error",
  },
  info: {
    icon: <Info size={18} />,
    className: "border-outline-variant/40 bg-surface-container-lowest text-on-surface",
    iconClassName: "text-primary-container",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (variant: ToastVariant, options: ToastOptions) => {
      const id = ++toastId;
      const duration = options.duration ?? 4500;

      setToasts((current) => [
        ...current,
        {
          id,
          title: options.title,
          description: options.description,
          variant,
        },
      ]);

      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (title, description) => show("success", { title, description }),
      error: (title, description) => show("error", { title, description }),
      info: (title, description) => show("info", { title, description }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="fixed inset-x-3 top-3 z-[100] flex flex-col gap-2 sm:left-auto sm:right-4 sm:top-4 sm:w-[min(24rem,calc(100vw-2rem))]"
      >
        {toasts.map((toast) => {
          const styles = TOAST_STYLES[toast.variant];

          return (
            <div
              key={toast.id}
              role={toast.variant === "error" ? "alert" : "status"}
              className={clsx(
                "flex min-w-0 items-start gap-3 rounded-lg border px-4 py-3 shadow-lg",
                styles.className,
              )}
            >
              <span className={clsx("mt-0.5 shrink-0", styles.iconClassName)}>
                {styles.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold leading-5">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-0.5 break-words text-xs leading-5 opacity-90">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-md p-1 opacity-80 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
