import { randomUUID } from "node:crypto";
import type { Prisma, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { priceCart } from "./pricing";
import type { CheckoutInput } from "@/validation/checkout";
import { getPaymentProvider } from "@/lib/payments";
import { serial } from "./transaction";
export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}
export async function createOrderAndPayment(args: {
  items: { variantId: string; quantity: number }[];
  input: CheckoutInput;
  userId?: string | null;
  cartId?: string;
  checkoutKey?: string;
}) {
  if (args.checkoutKey) {
    const existing = await db.order.findUnique({
      where: { checkoutKey: args.checkoutKey },
      include: { payments: true },
    });
    if (existing) {
      if (
        existing.sourceCartId !== args.cartId ||
        existing.userId !== (args.userId ?? null)
      )
        throw new CheckoutError("Checkout request is invalid.");
      if (existing.status === "CANCELLED")
        throw new CheckoutError(
          "This attempt was cancelled. Refresh checkout to try again.",
        );
      if (!existing.payments.length)
        throw new CheckoutError(
          "This checkout is already processing. Wait a moment and try again.",
        );
      return {
        orderId: existing.id,
        orderNumber: existing.orderNumber,
        clientSecret: "",
      };
    }
  }
  const provider = getPaymentProvider();
  const { input } = args;
  const order = await serial(async (tx) => {
    const priced = await priceCart(
      {
        items: args.items,
        couponCode: input.couponCode,
        userId: args.userId,
        email: input.customer.email,
        shippingMethodCode: input.shippingMethodCode,
        state: input.address?.state,
        postcode: input.address?.postcode,
      },
      tx,
    );
    if (!priced.lines.length) throw new CheckoutError("Your cart is empty.");
    if (priced.issues.length)
      throw new CheckoutError(priced.issues[0] ?? "Cart unavailable");
    if (priced.couponError) throw new CheckoutError(priced.couponError);
    if (priced.fulfilment === "DELIVERY" && !input.address)
      throw new CheckoutError("A delivery address is required.");
    for (const l of priced.lines) {
      const r = await tx.productVariant.updateMany({
        where: { id: l.variantId, stockQty: { gte: l.quantity } },
        data: { stockQty: { decrement: l.quantity } },
      });
      if (!r.count) throw new CheckoutError(`${l.productName} just sold out.`);
    }
    const o = await tx.order.create({
      data: {
        sourceCartId: args.cartId,
        checkoutKey: args.checkoutKey,
        orderNumber: `NG-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
        userId: args.userId ?? null,
        email: input.customer.email,
        firstName: input.customer.firstName,
        lastName: input.customer.lastName,
        phone: input.customer.phone,
        fulfilment: priced.fulfilment,
        customerNotes: input.customerNotes,
        couponCode: priced.couponCode,
        shipLine1: input.address?.line1,
        shipLine2: input.address?.line2,
        shipSuburb: input.address?.suburb,
        shipState: input.address?.state,
        shipPostcode: input.address?.postcode,
        subtotalCents: priced.subtotalCents,
        discountCents: priced.discountCents,
        shippingCents: priced.shippingCents,
        taxCents: priced.taxCents,
        totalCents: priced.totalCents,
        taxInclusive: priced.taxInclusive,
        shippingMethodName: priced.shippingMethodName,
        items: {
          create: priced.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            name: l.productName,
            variantName: l.variantName,
            sku: l.sku,
            imageUrl: l.imageUrl,
            unitPriceCents: l.unitPriceCents,
            quantity: l.quantity,
            lineTotalCents: l.lineTotalCents,
          })),
        },
        events: { create: { status: "PENDING", title: "Order placed" } },
      },
    });
    for (const l of priced.lines) {
      const v = await tx.productVariant.findUniqueOrThrow({
        where: { id: l.variantId },
        select: { stockQty: true },
      });
      await tx.inventoryTransaction.create({
        data: {
          variantId: l.variantId,
          delta: -l.quantity,
          balanceAfter: v.stockQty,
          reason: "SALE",
          orderId: o.id,
        },
      });
    }
    if (priced.couponCode) {
      const c = await tx.coupon.findUniqueOrThrow({
        where: { code: priced.couponCode },
      });
      await tx.coupon.update({
        where: { id: c.id },
        data: { usedCount: { increment: 1 } },
      });
      await tx.couponUsage.create({
        data: {
          couponId: c.id,
          userId: args.userId,
          email: o.email,
          orderId: o.id,
          amountCents: priced.discountCents,
        },
      });
    }
    return o;
  });
  let intentId: string | undefined;
  try {
    const payment = await provider.createPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountCents: order.totalCents,
      currency: "AUD",
      customerEmail: order.email,
    });
    intentId = payment.providerPaymentId;
    await db.payment.create({
      data: {
        orderId: order.id,
        provider: provider.name,
        providerPaymentId: intentId,
        amountCents: order.totalCents,
        status: "REQUIRES_ACTION",
      },
    });
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientSecret: payment.clientSecret,
    };
  } catch (e) {
    if (!intentId)
      throw new CheckoutError(
        `Payment setup could not be confirmed for ${order.orderNumber}. Contact the store before trying another checkout. Your reservation will be reconciled automatically.`,
      );
    if (intentId) {
      try {
        await provider.cancelPayment(intentId);
      } catch {
        throw new CheckoutError(
          "Payment setup needs review. Contact support with your order number.",
        );
      }
    }
    await serial(async (tx) => {
      await restoreStock(tx, order.id, "CANCELLATION");
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
    });
    throw e;
  }
}
export async function restoreStock(
  tx: Prisma.TransactionClient,
  orderId: string,
  reason: "CANCELLATION" | "RETURN",
) {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, stockReleasedAt: null },
    data: { stockReleasedAt: new Date() },
  });
  if (!claimed.count) return;
  const items = await tx.orderItem.findMany({
    where: { orderId, variantId: { not: null } },
  });
  for (const i of items) {
    const v = await tx.productVariant.update({
      where: { id: i.variantId! },
      data: { stockQty: { increment: i.quantity } },
      select: { stockQty: true },
    });
    await tx.inventoryTransaction.create({
      data: {
        variantId: i.variantId!,
        delta: i.quantity,
        balanceAfter: v.stockQty,
        reason,
        orderId,
      },
    });
  }
  if (reason === "CANCELLATION") {
    const usages = await tx.couponUsage.findMany({ where: { orderId } });
    for (const u of usages)
      await tx.coupon.update({
        where: { id: u.couponId },
        data: { usedCount: { decrement: 1 } },
      });
    await tx.couponUsage.deleteMany({ where: { orderId } });
  }
}
export async function releaseStock(
  orderId: string,
  reason: "CANCELLATION" | "RETURN",
) {
  await serial((tx) => restoreStock(tx, orderId, reason));
}
export const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};
export async function setOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string,
  adminId?: string,
) {
  const o = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { payments: true },
  });
  if (status === "CANCELLED") {
    if (o.paymentStatus === "PAID" || o.paymentStatus === "PARTIALLY_REFUNDED")
      throw new CheckoutError(
        "Refund a paid order from Payments before cancelling.",
      );
    let p = o.payments.find((p) => p.providerPaymentId);
    if (!p) {
      const provider = getPaymentProvider();
      const recovered = await provider.createPayment({
        orderId: o.id,
        orderNumber: o.orderNumber,
        amountCents: o.totalCents,
        currency: "AUD",
        customerEmail: o.email,
      });
      p = await db.payment.create({
        data: {
          orderId: o.id,
          provider: provider.name,
          providerPaymentId: recovered.providerPaymentId,
          amountCents: o.totalCents,
          status: "REQUIRES_ACTION",
        },
      });
    }

    if (p?.providerPaymentId)
      await getPaymentProvider().cancelPayment(p.providerPaymentId);
  }
  await serial(async (tx) => {
    const current = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    if (!transitions[current.status].includes(status))
      throw new CheckoutError(`Cannot change ${current.status} to ${status}.`);
    if (status !== "CANCELLED" && current.paymentStatus !== "PAID")
      throw new CheckoutError("Payment must be confirmed before fulfilment.");
    if (status === "CANCELLED") await restoreStock(tx, orderId, "CANCELLATION");
    await tx.order.update({ where: { id: orderId }, data: { status } });
    await tx.orderEvent.create({
      data: {
        orderId,
        status,
        title: `Order ${status.toLowerCase().replace(/_/g, " ")}`,
        note,
      },
    });
    if (adminId)
      await tx.auditLog.create({
        data: {
          adminId,
          action: "order.status_change",
          entity: "Order",
          entityId: orderId,
          metadata: { from: current.status, to: status, note: note ?? "" },
        },
      });
  });
}
