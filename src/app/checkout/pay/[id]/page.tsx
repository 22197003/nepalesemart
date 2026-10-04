import { Shell } from "@/components/ui";
import { accessibleOrder } from "@/services/order-access";
import { formatMoney } from "@/lib/utils";
import { PaymentForm } from "@/components/payment-form";
import Stripe from "stripe";
import Link from "next/link";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await accessibleOrder(id);
  const payment = order.payments[0];
  if (order.paymentStatus === "PAID" || order.status === "CANCELLED")
    return (
      <Shell title={order.orderNumber}>
        <p>Order status: {order.status}</p>
        <Link href={`/checkout/complete/${id}`}>View order</Link>
      </Shell>
    );
  if (
    !payment?.providerPaymentId ||
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_PUBLISHABLE_KEY
  )
    return (
      <Shell title="Payments unavailable">
        <p>Please contact the store to complete payment.</p>
      </Shell>
    );
  const intent = await new Stripe(
    process.env.STRIPE_SECRET_KEY,
  ).paymentIntents.retrieve(payment.providerPaymentId);
  return (
    <Shell title={`Pay for ${order.orderNumber}`}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card space-y-3 p-6">
          {order.items.map((i) => (
            <p key={i.id}>
              {i.quantity} × {i.name} ({i.variantName}) —{" "}
              {formatMoney(i.lineTotalCents)}
            </p>
          ))}
          <p>Subtotal: {formatMoney(order.subtotalCents)}</p>
          <p>Discount: −{formatMoney(order.discountCents)}</p>
          <p>Delivery: {formatMoney(order.shippingCents)}</p>
          <p>
            {order.taxInclusive ? "GST included" : "GST"}:{" "}
            {formatMoney(order.taxCents)}
          </p>
          <p className="text-2xl font-bold">
            Total: {formatMoney(order.totalCents)}
          </p>
        </div>
        <div className="card p-6">
          {intent.client_secret && (
            <PaymentForm
              clientSecret={intent.client_secret}
              publishableKey={process.env.STRIPE_PUBLISHABLE_KEY}
              orderId={id}
            />
          )}
        </div>
      </div>
    </Shell>
  );
}
