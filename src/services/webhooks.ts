import { Prisma } from "@prisma/client";
import type { WebhookEvent } from "@/lib/payments/provider";
import { serial } from "./transaction";
import { restoreStock } from "./orders";
export async function processPaymentEvent(event: WebhookEvent) {
  if (event.kind === "ignored") return { received: true };
  try {
    return await serial(async (tx) => {
      await tx.webhookEvent.create({
        data: { id: event.id, provider: "stripe", type: event.kind },
      });
      const payment = await tx.payment.findFirst({
        where: {
          provider: "stripe",
          providerPaymentId: event.providerPaymentId,
        },
        include: { order: { include: { items: true } } },
      });
      if (!payment) throw new Error("Payment record not yet available");
      const o = payment.order;
      if (event.kind === "payment.succeeded") {
        if (event.orderId !== o.id) throw new Error("Payment order mismatch");
        if (
          payment.status === "PAID" ||
          payment.status === "REFUNDED" ||
          payment.status === "PARTIALLY_REFUNDED"
        )
          return { received: true };
        if (o.stockReleasedAt)
          throw new Error(
            "Paid order has released inventory; manual review required",
          );
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "PAID", rawEventId: event.id },
        });
        await tx.order.update({
          where: { id: o.id },
          data: {
            paymentStatus: "PAID",
            status: o.status === "PENDING" ? "CONFIRMED" : o.status,
          },
        });
        await tx.orderEvent.create({
          data: {
            orderId: o.id,
            status: "CONFIRMED",
            title: "Payment confirmed",
          },
        });
        if (o.sourceCartId) {
          for (const item of o.items) {
            if (!item.variantId) continue;
            const cartItem = await tx.cartItem.findUnique({
              where: {
                cartId_variantId: {
                  cartId: o.sourceCartId,
                  variantId: item.variantId,
                },
              },
            });
            if (!cartItem) continue;
            if (cartItem.quantity <= item.quantity)
              await tx.cartItem.delete({ where: { id: cartItem.id } });
            else
              await tx.cartItem.update({
                where: { id: cartItem.id },
                data: { quantity: { decrement: item.quantity } },
              });
          }
        }
        await tx.notification.create({
          data: {
            channel: "EMAIL",
            template: "order_confirmation",
            toEmail: o.email,
            userId: o.userId,
            payload: {
              subject: `Order ${o.orderNumber} confirmed`,
              html: `<p>Your order ${o.orderNumber} has been paid and confirmed.</p><p>Total: AUD ${(o.totalCents / 100).toFixed(2)}</p>`,
            },
          },
        });
        for (const i of o.items)
          if (i.productId)
            await tx.product.update({
              where: { id: i.productId },
              data: { soldCount: { increment: i.quantity } },
            });
      } else if (event.kind === "payment.failed") {
        if (["PAID", "REFUNDED", "PARTIALLY_REFUNDED"].includes(payment.status))
          return { received: true };
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            failureReason: event.reason,
            rawEventId: event.id,
          },
        });
        await tx.order.update({
          where: { id: o.id },
          data: { paymentStatus: "FAILED" },
        });
      } else {
        if (event.refundedCents <= payment.refundedCents)
          return { received: true };
        const full = event.refundedCents >= payment.amountCents;
        const status = full ? "REFUNDED" : "PARTIALLY_REFUNDED";
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            refundedCents: event.refundedCents,
            status,
            rawEventId: event.id,
          },
        });
        await tx.order.update({
          where: { id: o.id },
          data: {
            paymentStatus: status,
            ...(full ? { status: "REFUNDED" } : {}),
          },
        });
        await tx.orderEvent.create({
          data: {
            orderId: o.id,
            title: full ? "Payment refunded" : "Payment partially refunded",
            ...(full ? { status: "REFUNDED" } : {}),
          },
        });
        if (
          full &&
          ["PENDING", "CONFIRMED", "PREPARING", "PACKED"].includes(o.status)
        )
          await restoreStock(tx, o.id, "RETURN");
      }
      return { received: true };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { received: true, duplicate: true };
    throw e;
  }
}
