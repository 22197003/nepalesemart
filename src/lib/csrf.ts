import { headers } from "next/headers";

/**
 * Server Actions are already origin-checked by Next.js. For custom Route Handlers that accept
 * cookie-authenticated POST/PUT/PATCH/DELETE, call this first (SameSite=Lax cookies are the second layer).
 */
export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host || new URL(origin).host !== host)
    throw new Response("Bad origin", { status: 403 });
}
