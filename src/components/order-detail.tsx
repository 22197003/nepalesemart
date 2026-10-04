import { formatMoney } from "@/lib/utils";
import type { accessibleOrder } from "@/services/order-access";
export function OrderDetail({
  order,
}: {
  order: Awaited<ReturnType<typeof accessibleOrder>>;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card space-y-4 p-6">
        <p>
          Status: <strong>{order.status}</strong> · Payment:{" "}
          {order.paymentStatus}
        </p>
        {order.items.map((i) => (
          <p key={i.id}>
            {i.quantity} × {i.name} ({i.variantName}) —{" "}
            {formatMoney(i.lineTotalCents)}
          </p>
        ))}
        <p className="text-xl">Total: {formatMoney(order.totalCents)}</p>
        <p>
          {order.shipLine1}, {order.shipSuburb} {order.shipState}{" "}
          {order.shipPostcode}
        </p>
        {order.shipments.map((s) => (
          <p key={s.id}>
            {s.carrier}: {s.trackingNumber}
            {s.trackingUrl && /^https:\/\//.test(s.trackingUrl) && (
              <a
                className="ml-3 underline"
                href={s.trackingUrl}
                target="_blank"
                rel="noreferrer"
              >
                Track delivery
              </a>
            )}
          </p>
        ))}
      </div>
      <div className="card p-6">
        <h2 className="mb-4 text-2xl">Order timeline</h2>
        <ol className="space-y-4">
          {order.events.map((e) => (
            <li key={e.id}>
              <p className="font-bold">{e.title}</p>
              <time className="text-sm">
                {e.createdAt.toLocaleString("en-AU", {
                  timeZone: "Australia/Melbourne",
                })}
              </time>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
