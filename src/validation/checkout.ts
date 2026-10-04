import { z } from "zod";

export const AU_STATES = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
] as const;

export const addressSchema = z.object({
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional(),
  suburb: z.string().trim().min(2).max(80),
  state: z.enum(AU_STATES),
  postcode: z.string().regex(/^\d{4}$/, "Enter a 4-digit Australian postcode"),
  country: z.literal("AU").default("AU"),
});

// NOTE: the client sends ONLY ids + quantities. Prices, stock, discounts and totals are recomputed server-side.
export const checkoutSchema = z.object({
  customer: z.object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    email: z.string().trim().toLowerCase().email(),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d][\d\s-]{7,18}$/, "Enter a valid phone number"),
  }),
  address: addressSchema.optional(), // omitted for pickup
  shippingMethodCode: z.string().min(1),
  couponCode: z.string().trim().toUpperCase().max(40).optional(),
  customerNotes: z.string().trim().max(500).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const cartItemSchema = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99),
});
