"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  loading = false,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-error/10 text-error">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h2 className="font-headline text-lg font-semibold text-on-surface">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="w-full px-4 py-2.5 sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              danger
                ? "w-full bg-error px-4 py-2.5 text-on-error hover:bg-error/90 sm:w-auto"
                : "w-full px-4 py-2.5 sm:w-auto"
            }
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
