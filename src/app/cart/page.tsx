import Link from "next/link";
import { db } from "@/lib/db";
import { getCart } from "@/services/cart";
import { priceCart } from "@/services/pricing";
import { Shell, Empty } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { updateCart, saveCoupon } from "@/app/shop-actions";
import { formatMoney } from "@/lib/utils";
export default async function Page() {
  const cart = await getCart();
  if (!cart?.items.length)
    return (
      <Shell title="Your cart">
        <Empty text="Your cart is empty." />
      </Shell>
    );
  const [priced, items] = await Promise.all([
    priceCart({
      items: cart.items,
      couponCode: cart.couponCode ?? undefined,
      userId: cart.userId,
    }),
    db.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        variant: {
          include: { product: { select: { name: true, slug: true } } },
        },
      },
    }),
  ]);
  return (
    <Shell title="Your cart">
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {items.map((i) => (
            <article className="card p-5" key={i.id}>
              <Link
                className="text-xl"
                href={`/product/${i.variant.product.slug}`}
              >
                {i.variant.product.name}
              </Link>
              <p>
                {i.variant.name} ·{" "}
                {formatMoney(i.variant.salePriceCents ?? i.variant.priceCents)}
              </p>
              <ActionForm
                className="mt-3 flex flex-wrap items-center gap-3"
                action={updateCart}
                label="Update"
              >
                <input type="hidden" name="itemId" value={i.id} />
                <label>
                  Quantity (0 removes)
                  <input
                    className="input w-24"
                    type="number"
                    name="quantity"
                    min="0"
                    max="99"
                    defaultValue={i.quantity}
                  />
                </label>
              </ActionForm>
            </article>
          ))}
        </div>
        <aside className="card h-fit space-y-4 p-6">
          <p>Subtotal: {formatMoney(priced.subtotalCents)}</p>
          <p>Discount: {formatMoney(priced.discountCents)}</p>
          <p>Delivery and final GST are calculated at checkout.</p>
          {priced.issues.map((i) => (
            <p key={i} role="alert" className="text-red-800">
              {i}
            </p>
          ))}
          {priced.couponError && <p role="alert">{priced.couponError}</p>}
          <ActionForm action={saveCoupon} label="Apply coupon">
            <label>
              Coupon
              <input
                className="input"
                name="couponCode"
                defaultValue={cart.couponCode ?? ""}
              />
            </label>
          </ActionForm>
          <Link className="btn-primary" href="/checkout">
            Checkout
          </Link>
          <p className="text-sm">Guest checkout is available.</p>
        </aside>
      </div>
    </Shell>
  );
}
