import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getTaxSettings } from "./settings";
import { taxOn } from "@/lib/tax";
import { applyCoupon } from "./coupons";
import { quoteShipping } from "./shipping";

export type PricedLine = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  taxable: boolean;
  categoryIds: string[];
  weightGrams: number;
  shippable: boolean;
  issue?: string;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  taxInclusive: boolean;
  couponCode?: string;
  couponError?: string;
  shippingMethodName?: string;
  fulfilment: "DELIVERY" | "PICKUP";
  issues: string[];
};

/**
 * THE source of truth for money. Used by the cart UI, checkout summary and order creation.
 * Input from the client is variant ids + quantities only; every price/stock/rule is re-read from the DB.
 */
export async function priceCart(
  args: {
    items: { variantId: string; quantity: number }[];
    couponCode?: string;
    userId?: string | null;
    email?: string;
    shippingMethodCode?: string;
    state?: string;
    postcode?: string;
  },
  client: Prisma.TransactionClient = db,
): Promise<PricedCart> {
  const quantities = new Map<string, number>();
  for (const item of args.items) {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    )
      throw new Error("Invalid cart quantity");
    quantities.set(
      item.variantId,
      (quantities.get(item.variantId) ?? 0) + item.quantity,
    );
  }
  args = {
    ...args,
    items: [...quantities].map(([variantId, quantity]) => ({
      variantId,
      quantity,
    })),
  };
  const tax = await getTaxSettings(client);
  const variants = await client.productVariant.findMany({
    where: { id: { in: args.items.map((i) => i.variantId) } },
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const issues: string[] = [];
  const lines: PricedLine[] = [];

  for (const item of args.items) {
    const v = byId.get(item.variantId);
    if (!v || !v.isActive || v.product.status !== "ACTIVE") {
      issues.push("An item in your cart is no longer available.");
      continue;
    }
    let qty = item.quantity,
      issue: string | undefined;
    if (v.stockQty <= 0) {
      issues.push(`${v.product.name} (${v.name}) is out of stock.`);
      continue;
    }
    if (qty > v.stockQty) {
      qty = v.stockQty;
      issue = `Only ${v.stockQty} left`;
      issues.push(
        `Only ${v.stockQty} of ${v.product.name} (${v.name}) available.`,
      );
    }
    const unit = v.salePriceCents ?? v.priceCents;
    const cats = [
      v.product.categoryId,
      ...(v.product.subcategoryId ? [v.product.subcategoryId] : []),
    ];
    lines.push({
      variantId: v.id,
      productId: v.productId,
      productName: v.product.name,
      variantName: v.name,
      sku: v.sku,
      imageUrl: v.imageUrl ?? v.product.images[0]?.url ?? null,
      unitPriceCents: unit,
      quantity: qty,
      lineTotalCents: unit * qty,
      taxable: v.product.isTaxable,
      categoryIds: cats,
      weightGrams: (v.weightGrams ?? v.product.weightGrams ?? 0) * qty,
      shippable: v.product.shippingEligible,
      issue,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);

  let taxableDiscount = 0;
  let discount = 0,
    couponCode: string | undefined,
    couponError: string | undefined,
    freeShip = false;
  if (args.couponCode) {
    const r = await applyCoupon(
      {
        code: args.couponCode,
        subtotalCents: subtotal,
        userId: args.userId,
        email: args.email,
        lines: lines.map((l) => ({
          productId: l.productId,
          categoryIds: l.categoryIds,
          lineTotalCents: l.lineTotalCents,
          taxable: l.taxable,
        })),
      },
      client,
    );
    if (r.ok) {
      discount = r.discountCents;
      taxableDiscount = r.taxableDiscountCents;
      couponCode = r.code;
      freeShip = r.freeShipping;
    } else couponError = r.error;
  }

  const selectedMethod = args.shippingMethodCode
    ? await client.shippingMethod.findUnique({
        where: { code: args.shippingMethodCode },
      })
    : null;
  const coldProducts = variants.some(
    (v) => v.product.storageType !== "AMBIENT",
  );
  if (
    args.shippingMethodCode &&
    selectedMethod?.type !== "PICKUP" &&
    coldProducts
  ) {
    const cold = await client.siteSetting.findUnique({
      where: { key: "coldChain" },
    });
    const states =
      (cold?.value as { states?: string[] } | undefined)?.states ?? [];
    if (!args.state || !states.includes(args.state))
      issues.push(
        "Frozen and refrigerated products cannot be delivered to this destination. Remove these items or choose a supported destination.",
      );
  }
  let shipping = 0,
    methodName: string | undefined,
    fulfilment: "DELIVERY" | "PICKUP" = "DELIVERY";
  if (args.shippingMethodCode) {
    const quotes = await quoteShipping(
      {
        state: args.state,
        postcode: args.postcode,
        subtotalCents: subtotal - discount,
        weightGrams: lines.reduce((s, l) => s + l.weightGrams, 0),
        shippable: lines.every((l) => l.shippable),
      },
      client,
    );
    const q = quotes.find((x) => x.methodCode === args.shippingMethodCode);
    if (!q)
      issues.push(
        "The selected delivery method isn't available for this address.",
      );
    else {
      shipping = freeShip ? 0 : q.priceCents;
      methodName = q.name;
      fulfilment = q.type;
    }
  }

  // Tax is computed on discounted taxable lines (discount spread pro-rata), plus shipping when taxable.
  const taxableBase = lines
    .filter((l) => l.taxable)
    .reduce((s, l) => s + l.lineTotalCents, 0);
  const discountedTaxable = Math.max(0, taxableBase - taxableDiscount);
  const taxableTotal = discountedTaxable + shipping;
  const taxCents = taxOn(taxableTotal, tax);
  const total =
    subtotal - discount + shipping + (tax.pricesIncludeTax ? 0 : taxCents);

  return {
    lines,
    subtotalCents: subtotal,
    discountCents: discount,
    shippingCents: shipping,
    taxCents,
    totalCents: total,
    taxInclusive: tax.pricesIncludeTax,
    couponCode,
    couponError,
    shippingMethodName: methodName,
    fulfilment,
    issues,
  };
}
