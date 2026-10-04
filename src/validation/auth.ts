import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "At least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/\d/, "Add a number");

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(20).optional(),
  password: passwordSchema,
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});
export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export const resetSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});
