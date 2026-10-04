import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { accessibleOrder } from "@/services/order-access";
import { OrderDetail } from "@/components/order-detail";
import { Shell } from "@/components/ui";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const s = await requireUser();
  const o = await accessibleOrder((await params).id);
  if (o.userId !== s.userId) notFound();
  return (
    <Shell title={o.orderNumber}>
      <OrderDetail order={o} />
    </Shell>
  );
}
