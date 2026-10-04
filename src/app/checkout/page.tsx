import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Shell, Empty } from "@/components/ui";
import { CheckoutForm } from "@/components/checkout-form";
import { getCart } from "@/services/cart";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
export default async function Page() {
  const cart = await getCart();
  if (!cart?.items.length)
    return (
      <Shell title="Checkout">
        <Empty text="Add products before checking out." />
      </Shell>
    );
  const s = await getSession();
  const methods = await db.shippingMethod.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, type: true },
  });
  return (
    <Shell
      title="Make yourself at home."
      description="Just a few details and your favourites will be on their way."
      eyebrow="Checkout"
    >
      <ol className="mb-8 grid grid-cols-3 gap-2 text-sm">
        {["Delivery details", "Review & pay", "Confirmation"].map((step, i) => (
          <li
            key={step}
            aria-current={i === 0 ? "step" : undefined}
            className={`border-t-2 pt-3 ${i === 0 ? "border-burgundy font-bold text-burgundy" : "border-night/15 text-night/50"}`}
          >
            <span className="mr-2">0{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="card form-panel p-6 sm:p-8">
          <h2 className="mb-6 text-2xl">Contact & delivery</h2>
          <CheckoutForm
            methods={methods}
            user={s?.user}
            checkoutKey={randomUUID()}
          />
        </div>
        <aside className="rounded-2xl bg-night p-7 text-white lg:sticky lg:top-28">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-light">
            Almost there
          </p>
          <h2 className="mt-3 text-3xl">Your next taste of home.</h2>
          <div className="mt-6 space-y-5 text-sm leading-relaxed text-white/75">
            <p>
              <strong className="mb-1 block text-white">
                Delivery that fits
              </strong>
              Available delivery and pickup methods are shown in the form.
              Delivery eligibility is checked against your address.
            </p>
            <p>
              <strong className="mb-1 block text-white">
                Review before you pay
              </strong>
              You’ll see your final total, including delivery and GST, before
              making payment.
            </p>
            <p>
              <strong className="mb-1 block text-white">
                No account required
              </strong>
              You can complete your order as a guest.
            </p>
          </div>
          <Link
            className="mt-7 inline-block text-sm font-bold text-gold-light"
            href="/cart"
          >
            ← Return to your cart
          </Link>
        </aside>
      </div>
    </Shell>
  );
}
