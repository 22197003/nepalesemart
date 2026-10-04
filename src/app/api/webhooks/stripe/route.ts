import { flushNotifications } from "@/lib/email";
import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { processPaymentEvent } from "@/services/webhooks";
export const runtime = "nodejs";
export async function POST(req: Request) {
  let event;
  try {
    event = getPaymentProvider().parseWebhook(
      await req.text(),
      req.headers.get("stripe-signature"),
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    const result = await processPaymentEvent(event);
    await flushNotifications();
    return NextResponse.json(result);
  } catch (e) {
    console.error(
      "Payment webhook could not be committed",
      e instanceof Error ? e.message : "unknown",
    );
    return NextResponse.json(
      { error: "Please retry this event" },
      { status: 500 },
    );
  }
}
