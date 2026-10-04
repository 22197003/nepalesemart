import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type CouponLine = {
  productId: string;
  categoryIds: string[];
  lineTotalCents: number;
  taxable?: boolean;
};
export type CouponResult =
  | {
      ok: true;
      couponId: string;
      code: string;
      discountCents: number;
      taxableDiscountCents: number;
      freeShipping: boolean;
    }
  | { ok: false; error: string };

export async function applyCoupon(
  args: {
    code: string;
    lines: CouponLine[];
    subtotalCents: number;
    userId?: string | null;
    email?: string;
  },
  client: Prisma.TransactionClient = db,
): Promise<CouponResult> {
  const c = await client.coupon.findUnique({
    where: { code: args.code.toUpperCase() },
    include: {
      products: { select: { id: true } },
      categories: { select: { id: true } },
    },
  });
  const now = new Date();
  if (!c || !c.isActive) return { ok: false, error: "This code isn't valid." };
  if (c.startsAt && c.startsAt > now)
    return { ok: false, error: "This code isn't active yet." };
  if (c.expiresAt && c.expiresAt < now)
    return { ok: false, error: "This code has expired." };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit)
    return { ok: false, error: "This code has reached its usage limit." };
  if (c.minOrderCents != null && args.subtotalCents < c.minOrderCents)
    return {
      ok: false,
      error: "Your order doesn't meet the minimum for this code.",
    };

  if (c.perCustomerLimit != null && (args.userId || args.email)) {
    const used = await client.couponUsage.count({
      where: {
        couponId: c.id,
        OR: [
          ...(args.userId ? [{ userId: args.userId }] : []),
          ...(args.email ? [{ email: args.email }] : []),
        ],
      },
    });
    if (used >= c.perCustomerLimit)
      return { ok: false, error: "You've already used this code." };
  }

  // Product/category scoped coupons discount only eligible lines.
  const scoped = c.products.length > 0 || c.categories.length > 0;
  const pIds = new Set(c.products.map((p) => p.id));
  const cIds = new Set(c.categories.map((x) => x.id));
  const eligible = args.lines.filter(
    (l) =>
      !scoped ||
      pIds.has(l.productId) ||
      l.categoryIds.some((id) => cIds.has(id)),
  );
  const base = eligible.reduce((s, l) => s + l.lineTotalCents, 0);
  if (scoped && base === 0)
    return {
      ok: false,
      error: "This code doesn't apply to items in your cart.",
    };

  let discount =
    c.type === "PERCENTAGE" ? Math.round((base * c.value) / 100) : c.value;
  if (c.maxDiscountCents != null)
    discount = Math.min(discount, c.maxDiscountCents);
  discount = Math.min(discount, base);
  return {
    ok: true,
    couponId: c.id,
    code: c.code,
    discountCents: discount,
    taxableDiscountCents: base
      ? Math.round(
          (discount *
            eligible
              .filter((l) => l.taxable)
              .reduce((sum, l) => sum + l.lineTotalCents, 0)) /
            base,
        )
      : 0,
    freeShipping: c.freeShipping,
  };
}
