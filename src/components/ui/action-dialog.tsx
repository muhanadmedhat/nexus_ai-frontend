"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { AlertTriangle, MessageSquareText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PromptOptions extends ConfirmOptions {
  label: string;
  placeholder?: string;
  initialValue?: string;
  required?: boolean;
  minLength?: number;
}

type DialogState =
  | { kind: "confirm"; options: ConfirmOptions }
  | { kind: "prompt"; options: PromptOptions }
  | null;

interface ActionDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ActionDialogContext = createContext<ActionDialogContextValue | null>(null);

export function ActionDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState("");
  const resolver = useRef<
    ((result: boolean | string | null) => void) | null
  >(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const close = useCallback((result: boolean | string | null) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
    setValue("");
    setValidationError("");
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    resolver.current?.(false);
    setDialog({ kind: "confirm", options });
    return new Promise<boolean>((resolve) => {
      resolver.current = (result) => resolve(result === true);
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    resolver.current?.(null);
    setValue(options.initialValue ?? "");
    setDialog({ kind: "prompt", options });
    return new Promise<string | null>((resolve) => {
      resolver.current = (result) =>
        resolve(typeof result === "string" ? result : null);
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(dialog.kind === "confirm" ? false : null);
    };
    window.addEventListener("keydown", handleKeyDown);
    if (dialog.kind === "prompt") {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, dialog]);

  const submitPrompt = () => {
    if (dialog?.kind !== "prompt") return;
    const trimmed = value.trim();
    const minimum = dialog.options.minLength ?? 0;
    if (dialog.options.required && !trimmed) {
      setValidationError("This field is required.");
      return;
    }
    if (trimmed && trimmed.length < minimum) {
      setValidationError(`Enter at least ${minimum} characters.`);
      return;
    }
    close(trimmed);
  };

  return (
    <ActionDialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {dialog ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close(dialog.kind === "confirm" ? false : null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-dialog-title"
            aria-describedby="action-dialog-description"
            className="w-full max-w-lg rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    dialog.options.danger
                      ? "bg-error/10 text-error"
                      : "bg-primary-container/10 text-primary-container"
                  }`}
                >
                  {dialog.kind === "confirm" ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <MessageSquareText size={20} />
                  )}
                </span>
                <div className="min-w-0">
                  <h2
                    id="action-dialog-title"
                    className="font-headline text-lg font-semibold text-on-surface"
                  >
                    {dialog.options.title}
                  </h2>
                  <p
                    id="action-dialog-description"
                    className="mt-1 text-sm leading-6 text-on-surface-variant"
                  >
                    {dialog.options.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => close(dialog.kind === "confirm" ? false : null)}
                className="shrink-0 rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {dialog.kind === "prompt" ? (
              <label className="mt-5 block text-sm font-medium text-on-surface">
                {dialog.options.label}
                <textarea
                  ref={inputRef}
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    setValidationError("");
                  }}
                  rows={4}
                  placeholder={dialog.options.placeholder}
                  className="mt-2 w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm leading-6 text-on-surface outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                  aria-invalid={Boolean(validationError)}
                  aria-describedby={validationError ? "action-dialog-error" : undefined}
                />
                {validationError ? (
                  <span id="action-dialog-error" className="mt-1 block text-xs text-error">
                    {validationError}
                  </span>
                ) : null}
              </label>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => close(dialog.kind === "confirm" ? false : null)}
                className="w-full px-4 py-2.5 sm:w-auto"
              >
                {dialog.options.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                type="button"
                onClick={() =>
                  dialog.kind === "confirm" ? close(true) : submitPrompt()
                }
                className={
                  dialog.options.danger
                    ? "w-full bg-error px-4 py-2.5 text-on-error hover:bg-error/90 sm:w-auto"
                    : "w-full px-4 py-2.5 sm:w-auto"
                }
              >
                {dialog.options.confirmLabel ?? "Continue"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </ActionDialogContext.Provider>
  );
}

export function useActionDialog() {
  const context = useContext(ActionDialogContext);
  if (!context) {
    throw new Error("useActionDialog must be used inside ActionDialogProvider");
  }
  return context;
}
