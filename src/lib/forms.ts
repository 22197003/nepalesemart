import { z } from "zod";
export const text = (f: FormData, key: string) => String(f.get(key) ?? "");
export const formError = (e: unknown) =>
  e instanceof z.ZodError
    ? (e.issues[0]?.message ?? "Invalid input")
    : e instanceof Error && e.name === "UserError"
      ? e.message
      : "We couldn't complete this request. Please try again.";
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
export function safeNext(value: string) {
  return value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/account";
}
export const httpsUrl = z
  .string()
  .url()
  .refine((s) => new URL(s).protocol === "https:", "Use an HTTPS URL");
