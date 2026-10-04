import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
export default async function Page() {
  await requirePermission("dashboard.view");
  const [orders, products, pending, revenue] = await Promise.all([
    db.order.count(),
    db.product.count(),
    db.order.count({ where: { status: "PENDING" } }),
    db.payment.aggregate({
      _sum: { amountCents: true, refundedCents: true },
      where: { status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } },
    }),
  ]);
  return (
    <>
      <h1 className="mb-6 text-3xl">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["Orders", orders],
          ["Products", products],
          ["Pending orders", pending],
          [
            "Net collected",
            formatMoney(
              (revenue._sum.amountCents ?? 0) -
                (revenue._sum.refundedCents ?? 0),
            ),
          ],
        ].map(([k, v]) => (
          <div className="card p-6" key={k}>
            <p>{k}</p>
            <p className="mt-2 text-3xl">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-6">
        Use the admin menu to manage your catalog, delivery rules, customers and
        homepage.
      </p>
    </>
  );
}
