import { flushNotifications } from "@/lib/email";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setOrderStatus } from "@/services/orders";
export async function GET(req: Request) {
  if (
    !process.env.CRON_SECRET ||
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: { in: ["UNPAID", "REQUIRES_ACTION", "FAILED"] },
      createdAt: { lt: new Date(Date.now() - 30 * 60000) },
    },
    take: 100,
    select: { id: true },
  });
  let cancelled = 0;
  for (const o of rows) {
    try {
      await setOrderStatus(o.id, "CANCELLED", "Unpaid order expired");
      cancelled++;
    } catch {
      /* Stripe may have completed payment; never release that reservation. */
    }
  }
  await flushNotifications();
  return NextResponse.json({ checked: rows.length, cancelled });
}
