import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
export async function getCart(create = false) {
  const session = await getSession();
  const jar = await cookies();
  const guestToken = jar.get("ng_cart")?.value;
  let cart = session
    ? await db.cart.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: "asc" },
        include: { items: true },
      })
    : guestToken
      ? await db.cart.findUnique({
          where: { guestToken },
          include: { items: true },
        })
      : null;
  if (!cart && create) {
    const token = randomBytes(32).toString("hex");
    cart = await db.cart.create({
      data: session ? { userId: session.userId } : { guestToken: token },
      include: { items: true },
    });
    if (!session)
      jar.set("ng_cart", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 2592000,
      });
  }
  return cart;
}

export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const token = jar.get("ng_cart")?.value;
  if (!token) return;
  await db.$transaction(
    async (tx) => {
      const guest = await tx.cart.findUnique({
        where: { guestToken: token },
        include: { items: true },
      });
      if (!guest || guest.userId) return;
      const existing = await tx.cart.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      if (!existing) {
        await tx.cart.update({
          where: { id: guest.id },
          data: { userId, guestToken: null },
        });
        return;
      }
      for (const i of guest.items) {
        const item = await tx.cartItem.findUnique({
          where: {
            cartId_variantId: { cartId: existing.id, variantId: i.variantId },
          },
        });
        await tx.cartItem.upsert({
          where: {
            cartId_variantId: { cartId: existing.id, variantId: i.variantId },
          },
          create: {
            cartId: existing.id,
            variantId: i.variantId,
            quantity: i.quantity,
          },
          update: {
            quantity: Math.min(99, (item?.quantity ?? 0) + i.quantity),
          },
        });
      }
      await tx.cart.delete({ where: { id: guest.id } });
    },
    { isolationLevel: "Serializable" },
  );
  jar.delete("ng_cart");
}
