import Stripe from "stripe";
import type { PaymentProvider, WebhookEvent } from "./provider";
import { PaymentsNotConfiguredError } from "./provider";

export function createStripeProvider(): PaymentProvider {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) throw new PaymentsNotConfiguredError();
  const stripe = new Stripe(secret);

  return {
    name: "stripe",
    async createPayment({
      orderId,
      orderNumber,
      amountCents,
      currency,
      customerEmail,
    }) {
      // Amount comes from the server-computed order total – never from the client.
      const pi = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: currency.toLowerCase(),
          receipt_email: customerEmail,
          automatic_payment_methods: { enabled: true },
          metadata: { orderId, orderNumber },
        },
        { idempotencyKey: `order-${orderId}-pi` },
      );
      return { providerPaymentId: pi.id, clientSecret: pi.client_secret ?? "" };
    },
    async cancelPayment(id) {
      const current = await stripe.paymentIntents.retrieve(id);
      if (current.status !== "canceled") await stripe.paymentIntents.cancel(id);
    },
    async refund(providerPaymentId, amountCents, idempotencyKey) {
      const r = await stripe.refunds.create(
        {
          payment_intent: providerPaymentId,
          amount: amountCents,
        },
        { idempotencyKey },
      );
      return { providerRefundId: r.id };
    },
    parseWebhook(rawBody, signature): WebhookEvent {
      if (!signature) throw new Error("Missing signature");
      const ev = stripe.webhooks.constructEvent(rawBody, signature, whSecret);
      switch (ev.type) {
        case "payment_intent.succeeded": {
          const pi = ev.data.object as Stripe.PaymentIntent;
          return {
            id: ev.id,
            kind: "payment.succeeded",
            providerPaymentId: pi.id,
            orderId: String(pi.metadata.orderId),
          };
        }
        case "payment_intent.payment_failed": {
          const pi = ev.data.object as Stripe.PaymentIntent;
          return {
            id: ev.id,
            kind: "payment.failed",
            providerPaymentId: pi.id,
            orderId: String(pi.metadata.orderId),
            reason: pi.last_payment_error?.message,
          };
        }
        case "charge.refunded": {
          const ch = ev.data.object as Stripe.Charge;
          return {
            id: ev.id,
            kind: "refund.updated",
            providerPaymentId: String(ch.payment_intent),
            refundedCents: ch.amount_refunded,
          };
        }
        default:
          return { id: ev.id, kind: "ignored" };
      }
    },
  };
}
