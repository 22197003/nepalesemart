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
      <header className="mb-8">
        <p className="detail-label mb-3">Store overview</p>
        <h1 className="text-4xl">Welcome back.</h1>
        <p className="mt-3 text-night/60">
          A clear view of your store, and what needs your attention.
        </p>
      </header>
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
            <p className="detail-label">{k}</p>
            <p className="mt-4 text-4xl font-bold tracking-tight">{v}</p>
          </div>
        ))}
      </div>
      <section className="card mt-8 p-6">
        <h2 className="text-2xl">Make yourself at home</h2>
        <p className="mt-2 max-w-xl text-night/60">
          Use the menu to manage your products, prepare orders and keep your
          storefront up to date. The options shown follow your account
          permissions.
        </p>
      </section>
    </>
  );
}
