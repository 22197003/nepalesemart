import { z } from "zod";

// Server-only. Validated lazily so `next build` doesn't need every secret.
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Nepali Ghar Australia <orders@example.com>"),
  IMAGE_STORAGE_ENDPOINT: z.string().optional(),
  IMAGE_STORAGE_REGION: z.string().default("ap-southeast-2"),
  IMAGE_STORAGE_BUCKET: z.string().optional(),
  IMAGE_STORAGE_ACCESS_KEY_ID: z.string().optional(),
  IMAGE_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  IMAGE_PUBLIC_HOST: z.string().optional(),
});

let cached: z.infer<typeof schema> | null = null;
export function env() {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
