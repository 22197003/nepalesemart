import { Shell } from "@/components/ui";
import { OrderDetail } from "@/components/order-detail";
import { accessibleOrder } from "@/services/order-access";
import Link from "next/link";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const order = await accessibleOrder((await params).id);
  return (
    <Shell title={order.orderNumber}>
      {order.paymentStatus !== "PAID" && (
        <p role="status" className="mb-5">
          Payment status: {order.paymentStatus}. Confirmation appears after the
          payment provider notifies the store.{" "}
          <Link className="underline" href={`/checkout/complete/${order.id}`}>
            Refresh status
          </Link>
        </p>
      )}
      <OrderDetail order={order} />
    </Shell>
  );
}
