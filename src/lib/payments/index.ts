import type { PaymentProvider } from "./provider";
import { createStripeProvider } from "./stripe";

export function getPaymentProvider(): PaymentProvider {
  return createStripeProvider(); // swap here to change gateway
}
export const paymentsConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
