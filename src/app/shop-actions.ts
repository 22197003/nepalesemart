"use server";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCart } from "@/services/cart";
import { cartItemSchema } from "@/validation/checkout";
import { text, formError, UserError } from "@/lib/forms";
import type { FormState } from "@/components/action-form";
export async function addToCart(_: FormState, f: FormData): Promise<FormState> {
  try {
    const i = cartItemSchema.parse({
      variantId: text(f, "variantId"),
      quantity: Number(text(f, "quantity")),
    });
    const v = await db.productVariant.findUnique({
      where: { id: i.variantId },
      include: { product: { select: { status: true } } },
    });
    if (!v || !v.isActive || v.product.status !== "ACTIVE")
      throw new UserError("This product is unavailable.");
    const cart = await getCart(true);
    if (!cart) throw new Error("cart");
    await db.$transaction(
      async (tx) => {
        const existing = await tx.cartItem.findUnique({
          where: { cartId_variantId: { cartId: cart.id, variantId: v.id } },
        });
        const quantity = (existing?.quantity ?? 0) + i.quantity;
        if (quantity > v.stockQty || quantity > 99)
          throw new UserError("Not enough stock for this quantity.");
        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId: cart.id, variantId: v.id } },
          create: { cartId: cart.id, variantId: v.id, quantity },
          update: { quantity },
        });
      },
      { isolationLevel: "Serializable" },
    );
    revalidatePath("/cart");
    return { message: "Added to your cart." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function updateCart(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  try {
    const cart = await getCart();
    if (!cart) throw new UserError("Your cart is empty.");
    const quantity = Number(text(f, "quantity"));
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99)
      throw new UserError("Quantity must be between 0 and 99.");
    const id = text(f, "itemId");
    const item = await db.cartItem.findFirst({
      where: { id, cartId: cart.id },
      include: { variant: true },
    });
    if (!item) throw new UserError("Item not found.");
    if (quantity > item.variant.stockQty)
      throw new UserError("Not enough stock.");
    if (quantity === 0) await db.cartItem.delete({ where: { id } });
    else await db.cartItem.update({ where: { id }, data: { quantity } });
    revalidatePath("/cart");
    return { message: "Cart updated." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function saveCoupon(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const cart = await getCart();
  if (!cart) return { error: "Your cart is empty." };
  const couponCode = text(f, "couponCode").trim().toUpperCase().slice(0, 40);
  await db.cart.update({
    where: { id: cart.id },
    data: { couponCode: couponCode || null },
  });
  revalidatePath("/cart");
  return { message: "Coupon updated. Eligibility is checked at checkout." };
}
export async function toggleWishlist(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requireUser();
  try {
    const productId = text(f, "productId");
    const product = await db.product.findFirst({
      where: { id: productId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!product) throw new UserError("Product unavailable.");
    const list = await db.wishlist.upsert({
      where: { userId: s.userId },
      create: { userId: s.userId },
      update: {},
    });
    const item = await db.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: list.id, productId } },
    });
    if (item) await db.wishlistItem.delete({ where: { id: item.id } });
    else
      await db.wishlistItem.create({
        data: { wishlistId: list.id, productId },
      });
    revalidatePath("/wishlist");
    return { message: item ? "Removed from wishlist." : "Saved to wishlist." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function newsletter(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const { z } = await import("zod");
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0] ?? "local";
    if (!(await checkRateLimit(`newsletter:${ip}`, 10, 900)).ok)
      throw new UserError("Please wait before trying again.");
    const email = z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .parse(text(f, "email"));
    await db.newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: {},
    });
    return { message: "You're subscribed." };
  } catch (e) {
    return { error: formError(e) };
  }
}
