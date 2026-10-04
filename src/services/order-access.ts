import { validOrderToken } from "@/lib/order-token";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
export async function accessibleOrder(id: string) {
  const s = await getSession();
  const guest = (await cookies()).get(`ng_order_${id}`)?.value;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      shipments: true,
    },
  });
  if (
    !order ||
    (!validOrderToken(id, guest) && (!s || order.userId !== s.userId))
  )
    notFound();
  return order;
}
