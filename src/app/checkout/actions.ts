"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { PaymentsNotConfiguredError } from "@/lib/payments/provider";
import { orderToken } from "@/lib/order-token";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCart } from "@/services/cart";
import { getSession } from "@/lib/auth";
import { checkoutSchema } from "@/validation/checkout";
import { createOrderAndPayment, CheckoutError } from "@/services/orders";
import { text, formError } from "@/lib/forms";
import { checkRateLimit } from "@/lib/rate-limit";
import type { FormState } from "@/components/action-form";
export async function checkout(_: FormState, f: FormData): Promise<FormState> {
  let destination = "";
  try {
    const cart = await getCart();
    if (!cart?.items.length) return { error: "Your cart is empty." };
    if (!(await checkRateLimit(`checkout:${cart.id}`, 5, 300)).ok)
      return {
        error: "Please wait a few minutes before creating another order.",
      };
    const method = await db.shippingMethod.findFirst({
      where: { code: text(f, "shippingMethodCode"), isActive: true },
    });
    const input = checkoutSchema.parse({
      customer: {
        firstName: text(f, "firstName"),
        lastName: text(f, "lastName"),
        email: text(f, "email"),
        phone: text(f, "phone"),
      },
      address:
        method?.type === "PICKUP"
          ? undefined
          : {
              line1: text(f, "line1"),
              line2: text(f, "line2"),
              suburb: text(f, "suburb"),
              state: text(f, "state"),
              postcode: text(f, "postcode"),
              country: "AU",
            },
      shippingMethodCode: text(f, "shippingMethodCode"),
      couponCode: cart.couponCode ?? undefined,
      customerNotes: text(f, "customerNotes"),
    });
    const session = await getSession();
    const result = await createOrderAndPayment({
      cartId: cart.id,
      checkoutKey: z.string().uuid().parse(text(f, "checkoutKey")),
      items: cart.items,
      input,
      userId: session?.userId,
    });
    const token = orderToken(result.orderId);
    await (
      await cookies()
    ).set(`ng_order_${result.orderId}`, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 86400,
    });
    destination = `/checkout/pay/${result.orderId}`;
  } catch (e) {
    return {
      error:
        e instanceof PaymentsNotConfiguredError
          ? "Card payments are currently unavailable. Please contact the store."
          : e instanceof CheckoutError
            ? e.message
            : formError(e),
    };
  }
  redirect(destination);
}
