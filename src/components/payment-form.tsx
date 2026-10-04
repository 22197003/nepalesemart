"use client";
import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
function Payment({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError("");
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/complete/${orderId}`,
      },
    });
    if (result.error)
      setError(result.error.message ?? "Payment failed. Try again.");
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement />
      {error && <p role="alert">{error}</p>}
      <button className="btn-primary" disabled={busy || !stripe}>
        {busy ? "Processing…" : "Pay securely"}
      </button>
    </form>
  );
}
export function PaymentForm({
  clientSecret,
  publishableKey,
  orderId,
}: {
  clientSecret: string;
  publishableKey: string;
  orderId: string;
}) {
  const stripe = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      <Payment orderId={orderId} />
    </Elements>
  );
}
