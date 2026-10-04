"use client";
import { useActionState } from "react";
export type FormState = { error?: string; message?: string };
export function ActionForm({
  action,
  children,
  label = "Save",
  className = "space-y-4",
  disabled = false,
  secondary = false,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  children: React.ReactNode;
  label?: string;
  disabled?: boolean;
  secondary?: boolean;
  className?: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">
          {state.message}
        </p>
      )}
      <button
        disabled={pending || disabled}
        className={`${secondary ? "btn-secondary" : "btn-primary"} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {pending ? "Please wait…" : label}
      </button>
    </form>
  );
}
