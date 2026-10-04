// Provider-agnostic payment contract. Orders/checkout code depends only on this interface,
// so Stripe can be swapped for another gateway by adding a file and changing getPaymentProvider().
export type CreatePaymentInput = {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  currency: "AUD";
  customerEmail: string;
};
export type CreatePaymentResult = {
  providerPaymentId: string;
  clientSecret: string;
};
export type WebhookEvent =
  | {
      id: string;
      kind: "payment.succeeded";
      providerPaymentId: string;
      orderId: string;
    }
  | {
      id: string;
      kind: "payment.failed";
      providerPaymentId: string;
      orderId: string;
      reason?: string;
    }
  | {
      id: string;
      kind: "refund.updated";
      providerPaymentId: string;
      refundedCents: number;
    }
  | { id: string; kind: "ignored" };

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  cancelPayment(providerPaymentId: string): Promise<void>;
  refund(
    providerPaymentId: string,
    amountCents?: number,
    idempotencyKey?: string,
  ): Promise<{ providerRefundId: string }>;
  /** Verifies the signature against the RAW body and maps the provider event to ours. */
  parseWebhook(rawBody: string, signature: string | null): WebhookEvent;
}

export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super(
      "Payments are not configured: set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.",
    );
  }
}
